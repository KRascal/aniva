/**
 * キャラクター別 推し度ランキングAPI
 * GET /api/ranking/[characterId]
 * 
 * 推し度スコア = (totalMessages * 1) + (level * 100) + (ギフト送信コイン合計 * 0.5) + (FC加入 * 500)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  // Top 50 relationships for this character
  const relationships = await prisma.relationship.findMany({
    where: { characterId },
    include: {
      user: {
        select: { id: true, displayName: true, nickname: true, avatarUrl: true },
      },
    },
    orderBy: [
      { experiencePoints: 'desc' },
      { totalMessages: 'desc' },
    ],
    take: 50,
  });

  // ギフト送信額を集計
  const giftTotals = await prisma.coinTransaction.groupBy({
    by: ['userId'],
    where: {
      type: 'GIFT_SENT',
      characterId,
    },
    _sum: { amount: true },
  });
  const giftMap = new Map(giftTotals.map(g => [g.userId, Math.abs(g._sum.amount ?? 0)]));

  // ランキング構築
  const ranking = relationships.map((rel, idx) => {
    const giftCoins = giftMap.get(rel.userId) ?? 0;
    const score = (rel.totalMessages * 1) + (rel.level * 100) + (giftCoins * 0.5) + (rel.isFanclub ? 500 : 0);
    return {
      rank: idx + 1,
      userId: rel.userId,
      displayName: rel.user.nickname || rel.user.displayName || '匿名ファン',
      avatarUrl: rel.user.avatarUrl,
      level: rel.level,
      totalMessages: rel.totalMessages,
      giftCoins,
      isFanclub: rel.isFanclub,
      score: Math.round(score),
      isMe: rel.userId === userId,
    };
  });

  // スコア順にソート
  ranking.sort((a, b) => b.score - a.score);
  ranking.forEach((r, i) => { r.rank = i + 1; });

  // 自分の順位を探す
  const myRank = ranking.find(r => r.isMe);

  return NextResponse.json({
    characterId,
    ranking: ranking.slice(0, 30), // Top 30のみ返す
    myRank: myRank ?? null,
    totalFans: relationships.length,
  });
}
