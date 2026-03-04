/**
 * 統合ランキングAPI
 * GET /api/ranking?type=coins|streak|messages&characterId=xxx&limit=50&period=daily|weekly|monthly|all
 *
 * type=coins    — コイン消費ランキング（推し度）
 * type=streak   — ストリークランキング（連続ログイン日数）
 * type=messages — トーク量ランキング（メッセージ数）
 *
 * period=daily   — 今日のみ (JST基準 00:00〜)
 * period=weekly  — 直近7日間
 * period=monthly — 直近30日間
 * period=all     — 全期間（デフォルト）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** JST基準の期間フィルタを返す */
function getPeriodFilter(period: string): Date | undefined {
  const now = new Date();

  if (period === 'daily') {
    // JST (UTC+9) の今日 00:00 を UTC に変換
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

  return undefined; // 'all' — フィルタなし
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'coins';
  const characterId = searchParams.get('characterId') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const period = searchParams.get('period') ?? 'all';

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const periodFrom = getPeriodFilter(period);

  // ---- coins ----
  if (type === 'coins') {
    // コイン消費ランキング: CoinTransaction で GIFT_SENT の合計
    const where = {
      type: 'GIFT_SENT' as const,
      ...(characterId ? { characterId } : {}),
      ...(periodFrom ? { createdAt: { gte: periodFrom } } : {}),
    };

    const totals = await prisma.coinTransaction.groupBy({
      by: ['userId'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'asc' } }, // amount は負数なので asc が降順絶対値
      take: limit,
    });

    const userIds = totals.map(t => t.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, nickname: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const ranking = totals.map((t, idx) => {
      const user = userMap.get(t.userId);
      const coins = Math.abs(t._sum.amount ?? 0);
      return {
        rank: idx + 1,
        userId: t.userId,
        displayName: user?.nickname || user?.displayName || '匿名ファン',
        avatarUrl: user?.avatarUrl ?? null,
        value: coins,
        valueLabel: `🪙 ${coins.toLocaleString()} コイン`,
        isMe: t.userId === userId,
      };
    });

    // Re-rank (groupBy ordering may not be exact with negative amounts)
    ranking.sort((a, b) => b.value - a.value);
    ranking.forEach((r, i) => { r.rank = i + 1; });

    const myRank = ranking.find(r => r.isMe) ?? null;
    return NextResponse.json({ type, period, ranking: ranking.slice(0, limit), myRank });
  }

  // ---- streak ----
  if (type === 'streak') {
    // ストリークランキング: Relationship.streakDays 最大値（期間フィルタ不要）
    const where = characterId ? { characterId } : {};

    const relationships = await prisma.relationship.findMany({
      where,
      select: {
        userId: true,
        streakDays: true,
        user: {
          select: { id: true, displayName: true, nickname: true, avatarUrl: true },
        },
      },
      orderBy: { streakDays: 'desc' },
      take: limit * 3,
    });

    // ユーザーごとに最大ストリークを集計
    const userMaxStreak = new Map<string, { streakDays: number; user: typeof relationships[0]['user'] }>();
    for (const rel of relationships) {
      const existing = userMaxStreak.get(rel.userId);
      if (!existing || rel.streakDays > existing.streakDays) {
        userMaxStreak.set(rel.userId, { streakDays: rel.streakDays, user: rel.user });
      }
    }

    const ranking = Array.from(userMaxStreak.values())
      .sort((a, b) => b.streakDays - a.streakDays)
      .slice(0, limit)
      .map((entry, idx) => ({
        rank: idx + 1,
        userId: entry.user.id,
        displayName: entry.user.nickname || entry.user.displayName || '匿名ファン',
        avatarUrl: entry.user.avatarUrl ?? null,
        value: entry.streakDays,
        valueLabel: `🔥 ${entry.streakDays}日連続`,
        isMe: entry.user.id === userId,
      }));

    const myRank = ranking.find(r => r.isMe) ?? null;

    // 自分が top limit に入っていない場合、自分のデータを探す
    let myRankOutside = null;
    if (!myRank && userId) {
      const myRels = await prisma.relationship.findMany({
        where: characterId ? { userId, characterId } : { userId },
        select: { streakDays: true },
        orderBy: { streakDays: 'desc' },
        take: 1,
      });
      if (myRels.length > 0) {
        myRankOutside = {
          rank: null as number | null,
          userId,
          value: myRels[0].streakDays,
          valueLabel: `🔥 ${myRels[0].streakDays}日連続`,
          isMe: true,
        };
        const higherCount = await prisma.relationship.count({
          where: { ...where, streakDays: { gt: myRels[0].streakDays } },
        });
        myRankOutside.rank = higherCount + 1;
      }
    }

    return NextResponse.json({ type, period, ranking, myRank: myRank ?? myRankOutside });
  }

  // ---- messages ----
  if (type === 'messages') {
    // トーク量ランキング: Message count で集計（期間フィルタ対応）
    // Message → Conversation → Relationship (userId, characterId) を JOIN する raw クエリ
    const conditions: string[] = [`m.role = 'USER'`];
    const params: (string | Date | number)[] = [];

    if (characterId) {
      params.push(characterId);
      conditions.push(`r."characterId" = $${params.length}`);
    }
    if (periodFrom) {
      params.push(periodFrom);
      conditions.push(`m."createdAt" >= $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    const whereClause = conditions.join(' AND ');

    type MsgRow = { userId: string; messageCount: bigint };

    const results = await prisma.$queryRawUnsafe<MsgRow[]>(
      `SELECT r."userId", COUNT(m.id) AS "messageCount"
       FROM "Message" m
       JOIN "Conversation" c ON m."conversationId" = c.id
       JOIN "Relationship" r ON c."relationshipId" = r.id
       WHERE ${whereClause}
       GROUP BY r."userId"
       ORDER BY "messageCount" DESC
       LIMIT ${limitParam}`,
      ...params,
    );

    const userIds = results.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, nickname: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const ranking = results.map((t, idx) => {
      const user = userMap.get(t.userId);
      const total = Number(t.messageCount);
      return {
        rank: idx + 1,
        userId: t.userId,
        displayName: user?.nickname || user?.displayName || '匿名ファン',
        avatarUrl: user?.avatarUrl ?? null,
        value: total,
        valueLabel: `💬 ${total.toLocaleString()}通`,
        isMe: t.userId === userId,
      };
    });

    const myRank = ranking.find(r => r.isMe) ?? null;
    return NextResponse.json({ type, period, ranking, myRank });
  }

  return NextResponse.json({ error: 'Invalid type. Use coins|streak|messages' }, { status: 400 });
}
