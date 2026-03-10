/**
 * キャラクター人気ランキングAPI
 * GET /api/ranking/characters?type=coins|messages&period=daily|weekly|monthly
 *
 * type=coins    — 推し貢献度（キャラに使われたコイン消費額）
 *                 チャット(10コイン/回) + 通話(コイン/分) + ギフト + その他消費
 *                 FC会員のチャットも通常消費額(10コイン)として加算
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

  return undefined; // alltime
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'coins';
  const period = searchParams.get('period') ?? 'weekly';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const periodFrom = getPeriodFilter(period);

  if (type === 'coins') {
    // ====== 消費コイン数ランキング ======
    // amount < 0 の全トランザクション（CHAT_EXTRA, SPEND, GIFT_SENT等）を集計
    // FC会員のチャットはamount=0だがメッセージ数×10を仮想加算
    const conditions: string[] = [`ct."characterId" IS NOT NULL`, `ct.amount < 0`];
    const params: (string | Date | number)[] = [];

    if (periodFrom) {
      params.push(periodFrom);
      conditions.push(`ct."createdAt" >= $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    type Row = { characterId: string; totalCoins: bigint };
    const coinResults = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT ct."characterId", ABS(SUM(ct.amount)) AS "totalCoins"
       FROM "CoinTransaction" ct
       WHERE ${conditions.join(' AND ')}
       GROUP BY ct."characterId"
       ORDER BY "totalCoins" DESC
       LIMIT ${limitParam}`,
      ...params,
    );

    // FC会員のチャットメッセージも仮想コインとして加算（10コイン/メッセージ）
    // FC会員は実際にはコインを消費しないが、ランキングには「本来消費されるべき額」を加算
    const msgConditions: string[] = [`m.role = 'USER'`];
    const msgParams: (string | Date | number)[] = [];
    if (periodFrom) {
      msgParams.push(periodFrom);
      msgConditions.push(`m."createdAt" >= $${msgParams.length}`);
    }
    msgParams.push(limit * 2);

    type MsgRow = { characterId: string; messageCount: bigint };
    const msgResults = await prisma.$queryRawUnsafe<MsgRow[]>(
      `SELECT r."characterId", COUNT(m.id) AS "messageCount"
       FROM "Message" m
       JOIN "Conversation" c ON m."conversationId" = c.id
       JOIN "Relationship" r ON c."relationshipId" = r.id
       WHERE ${msgConditions.join(' AND ')}
       GROUP BY r."characterId"
       ORDER BY "messageCount" DESC
       LIMIT $${msgParams.length}`,
      ...msgParams,
    );

    // コイン消費 + メッセージ×10 の合算マップ
    const scoreMap = new Map<string, number>();
    for (const r of coinResults) {
      const coins = Number(r.totalCoins);
      scoreMap.set(r.characterId, (scoreMap.get(r.characterId) ?? 0) + coins);
    }
    for (const r of msgResults) {
      const virtualCoins = Number(r.messageCount) * 10; // 1メッセージ = 10コイン相当
      scoreMap.set(r.characterId, (scoreMap.get(r.characterId) ?? 0) + virtualCoins);
    }

    // ソート
    const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    const charIds = sorted.map(([id]) => id);
    const characters = await prisma.character.findMany({
      where: { id: { in: charIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });
    const charMap = new Map(characters.map(c => [c.id, c]));

    const ranking = sorted.map(([charId, score], idx) => {
      const char = charMap.get(charId);
      return {
        rank: idx + 1,
        characterId: charId,
        name: char?.name ?? '不明',
        slug: char?.slug ?? '',
        avatarUrl: char?.avatarUrl ?? null,
        value: score,
        valueLabel: `🪙 ${score.toLocaleString()} コイン`,
      };
    });

    return NextResponse.json({ type, period, ranking });
  }

  if (type === 'messages') {
    // ====== メッセージ数ランキング ======
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
