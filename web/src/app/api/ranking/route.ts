/**
 * 統合ランキングAPI
 * GET /api/ranking?type=coins|streak|messages&characterId=xxx&limit=50
 *
 * type=coins   — コイン消費ランキング（推し度）
 * type=streak  — ストリークランキング（連続ログイン日数）
 * type=messages — トーク量ランキング（メッセージ数）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'coins';
  const characterId = searchParams.get('characterId') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (type === 'coins') {
    // コイン消費ランキング: CoinTransaction で GIFT_SENT の合計
    const where = characterId
      ? { type: 'GIFT_SENT' as const, characterId }
      : { type: 'GIFT_SENT' as const };

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
        valueLabel: `🪙 ${coins.toLocaleString()} coins`,
        isMe: t.userId === userId,
      };
    });

    // Re-rank (groupBy ordering may not be exact with negative amounts)
    ranking.sort((a, b) => b.value - a.value);
    ranking.forEach((r, i) => { r.rank = i + 1; });

    const myRank = ranking.find(r => r.isMe) ?? null;
    return NextResponse.json({ type, ranking: ranking.slice(0, limit), myRank });
  }

  if (type === 'streak') {
    // ストリークランキング: Relationship.streakDays 最大値
    const where = characterId ? { characterId } : {};

    // キャラごとのリレーションシップからユーザーのmax streakを取得
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
      take: limit * 3, // 重複ユーザーを除くために多めに取得
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

    // 自分がtop limitに入っていない場合、自分のデータを探す
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
        // 簡易順位計算
        const higherCount = await prisma.relationship.count({
          where: {
            ...where,
            streakDays: { gt: myRels[0].streakDays },
          },
        });
        myRankOutside.rank = higherCount + 1;
      }
    }

    return NextResponse.json({ type, ranking, myRank: myRank ?? myRankOutside });
  }

  if (type === 'messages') {
    // トーク量ランキング: Relationship.totalMessages 合計
    const where = characterId ? { characterId } : {};

    const relationships = await prisma.relationship.findMany({
      where,
      select: {
        userId: true,
        totalMessages: true,
        user: {
          select: { id: true, displayName: true, nickname: true, avatarUrl: true },
        },
      },
      orderBy: { totalMessages: 'desc' },
      take: limit * 3,
    });

    // ユーザーごとにtotalMessagesを合計
    const userTotals = new Map<string, { total: number; user: typeof relationships[0]['user'] }>();
    for (const rel of relationships) {
      const existing = userTotals.get(rel.userId);
      if (existing) {
        existing.total += rel.totalMessages;
      } else {
        userTotals.set(rel.userId, { total: rel.totalMessages, user: rel.user });
      }
    }

    const ranking = Array.from(userTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((entry, idx) => ({
        rank: idx + 1,
        userId: entry.user.id,
        displayName: entry.user.nickname || entry.user.displayName || '匿名ファン',
        avatarUrl: entry.user.avatarUrl ?? null,
        value: entry.total,
        valueLabel: `💬 ${entry.total.toLocaleString()}通`,
        isMe: entry.user.id === userId,
      }));

    const myRank = ranking.find(r => r.isMe) ?? null;
    return NextResponse.json({ type, ranking, myRank });
  }

  return NextResponse.json({ error: 'Invalid type. Use coins|streak|messages' }, { status: 400 });
}
