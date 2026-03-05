/**
 * キャラクター人気ランキングAPI
 * GET /api/ranking/characters?type=coins|messages&period=daily|weekly|monthly
 *
 * type=coins    — 推し貢献度（キャラに使われたコイン総額）
 * type=messages — トーク数（キャラへの総メッセージ数）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** JST基準の期間フィルタを返す */
function getPeriodFilter(period: string): Date | undefined {
  const now = new Date();

  if (period === 'daily') {
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const jstMidnight = new Date(jstNow.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    return new Date(jstMidnight.getTime() - jstOffset);
  }

  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }

  if (period === 'monthly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }

  return undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'coins';
  const period = searchParams.get('period') ?? 'weekly';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const periodFrom = getPeriodFilter(period);

  if (type === 'coins') {
    // キャラ別コイン消費合計
    const conditions: string[] = [`ct.type = 'GIFT_SENT'`, `ct."characterId" IS NOT NULL`];
    const params: (string | Date | number)[] = [];

    if (periodFrom) {
      params.push(periodFrom);
      conditions.push(`ct."createdAt" >= $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    type Row = { characterId: string; totalCoins: bigint };
    const results = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT ct."characterId", ABS(SUM(ct.amount)) AS "totalCoins"
       FROM "CoinTransaction" ct
       WHERE ${conditions.join(' AND ')}
       GROUP BY ct."characterId"
       ORDER BY "totalCoins" DESC
       LIMIT ${limitParam}`,
      ...params,
    );

    const charIds = results.map(r => r.characterId);
    const characters = await prisma.character.findMany({
      where: { id: { in: charIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });
    const charMap = new Map(characters.map(c => [c.id, c]));

    const ranking = results.map((r, idx) => {
      const char = charMap.get(r.characterId);
      const coins = Number(r.totalCoins);
      return {
        rank: idx + 1,
        characterId: r.characterId,
        name: char?.name ?? '不明',
        slug: char?.slug ?? '',
        avatarUrl: char?.avatarUrl ?? null,
        value: coins,
        valueLabel: `🪙 ${coins.toLocaleString()} コイン`,
      };
    });

    return NextResponse.json({ type, period, ranking });
  }

  if (type === 'messages') {
    // キャラ別メッセージ数合計
    const conditions: string[] = [`m.role = 'USER'`];
    const params: (string | Date | number)[] = [];

    if (periodFrom) {
      params.push(periodFrom);
      conditions.push(`m."createdAt" >= $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    type MsgRow = { characterId: string; messageCount: bigint };
    const results = await prisma.$queryRawUnsafe<MsgRow[]>(
      `SELECT r."characterId", COUNT(m.id) AS "messageCount"
       FROM "Message" m
       JOIN "Conversation" c ON m."conversationId" = c.id
       JOIN "Relationship" r ON c."relationshipId" = r.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY r."characterId"
       ORDER BY "messageCount" DESC
       LIMIT ${limitParam}`,
      ...params,
    );

    const charIds = results.map(r => r.characterId);
    const characters = await prisma.character.findMany({
      where: { id: { in: charIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });
    const charMap = new Map(characters.map(c => [c.id, c]));

    const ranking = results.map((r, idx) => {
      const char = charMap.get(r.characterId);
      const count = Number(r.messageCount);
      return {
        rank: idx + 1,
        characterId: r.characterId,
        name: char?.name ?? '不明',
        slug: char?.slug ?? '',
        avatarUrl: char?.avatarUrl ?? null,
        value: count,
        valueLabel: `💬 ${count.toLocaleString()}通`,
      };
    });

    return NextResponse.json({ type, period, ranking });
  }

  return NextResponse.json({ error: 'Invalid type. Use coins|messages' }, { status: 400 });
}
