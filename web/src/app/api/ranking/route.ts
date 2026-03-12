import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/ranking
 * キャラ別/全体ランキング
 * query: characterId?, period? (monthly|weekly|alltime), limit?
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const characterId = url.searchParams.get('characterId');
  const periodType = url.searchParams.get('period') ?? 'monthly';
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50', 10));

  // 現在の期間を計算
  const now = new Date();
  let period: string;
  if (periodType === 'weekly') {
    const weekNum = getISOWeek(now);
    period = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  } else if (periodType === 'alltime') {
    period = 'alltime';
  } else {
    period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  try {
    const where: Record<string, unknown> = { periodType, period };
    if (characterId) where.characterId = characterId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankings = await (prisma as any).rankingScore.findMany({
      where,
      orderBy: { totalScore: 'desc' },
      take: limit,
      select: {
        userId: true,
        characterId: true,
        chatScore: true,
        callScore: true,
        giftScore: true,
        totalScore: true,
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            nickname: true,
            image: true,
          },
        },
        character: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
          },
        },
      },
    });

    // ユーザーごとに集約（全キャラ合算の場合）
    if (!characterId) {
      const userMap = new Map<string, {
        userId: string;
        user: typeof rankings[0]['user'];
        totalScore: number;
        chatScore: number;
        callScore: number;
        giftScore: number;
      }>();

      for (const r of rankings) {
        const existing = userMap.get(r.userId);
        if (existing) {
          existing.totalScore += r.totalScore;
          existing.chatScore += r.chatScore;
          existing.callScore += r.callScore;
          existing.giftScore += r.giftScore;
        } else {
          userMap.set(r.userId, {
            userId: r.userId,
            user: r.user,
            totalScore: r.totalScore,
            chatScore: r.chatScore,
            callScore: r.callScore,
            giftScore: r.giftScore,
          });
        }
      }

      const aggregated = Array.from(userMap.values())
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit)
        .map((r, i) => ({ ...r, rank: i + 1 }));

      return NextResponse.json({ rankings: aggregated, period, periodType });
    }

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rankings: (rankings as any[]).map((r: any, i: number) => ({ ...r, rank: i + 1 })),
      period,
      periodType,
    });
  } catch (error) {
    logger.error('[ranking] error:', error);
    return NextResponse.json({ rankings: [], period, periodType });
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
