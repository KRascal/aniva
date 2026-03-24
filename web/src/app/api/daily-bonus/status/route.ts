/**
 * GET /api/daily-bonus/status
 * 読み取り専用: 今日のボーナス受取状況・ストリーク・報酬テーブルを返す
 * ボーナスの付与は行わない（POST /api/daily-bonus が担当）
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/** ストリーク日数 → 報酬倍率テーブル（daily-bonus/route.ts と一致させる） */
const STREAK_TIERS = [
  { day: 1, multiplier: 1, label: 'Day 1', milestone: false },
  { day: 2, multiplier: 1, label: 'Day 2', milestone: false },
  { day: 3, multiplier: 1.5, label: 'Day 3', milestone: true },
  { day: 5, multiplier: 2, label: 'Day 5', milestone: true },
  { day: 7, multiplier: 3, label: '1 Week', milestone: true },
  { day: 14, multiplier: 4, label: '2 Weeks', milestone: true },
  { day: 30, multiplier: 5, label: '1 Month', milestone: true },
] as const;

const BASE_COINS = 10;

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 今日既に受け取り済みか
    const todayBonus = await prisma.coinTransaction.findFirst({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'daily_login' },
        createdAt: { gte: todayStart },
      },
      select: { amount: true, createdAt: true },
    });

    const claimed = !!todayBonus;

    // ストリーク計算: 直近のdaily_loginボーナスを逆順に辿る
    const recentBonuses = await prisma.coinTransaction.findMany({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'daily_login' },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { createdAt: true },
    });

    let streak = claimed ? 1 : 0;
    const startDate = new Date(todayStart);
    if (claimed) {
      // 今日受け取り済み → 昨日以前を遡る
      for (let i = 0; i < recentBonuses.length; i++) {
        const bonusDate = new Date(recentBonuses[i].createdAt);
        bonusDate.setHours(0, 0, 0, 0);
        const expected = new Date(startDate);
        expected.setDate(expected.getDate() - (i + 1));
        expected.setHours(0, 0, 0, 0);
        if (bonusDate.getTime() === expected.getTime()) {
          streak++;
        } else {
          break;
        }
      }
    } else {
      // 未受け取り → 昨日を基準に遡る
      const yesterdayStart = new Date(startDate);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      for (let i = 0; i < recentBonuses.length; i++) {
        const bonusDate = new Date(recentBonuses[i].createdAt);
        bonusDate.setHours(0, 0, 0, 0);
        const expected = new Date(yesterdayStart);
        expected.setDate(expected.getDate() - i);
        expected.setHours(0, 0, 0, 0);
        if (bonusDate.getTime() === expected.getTime()) {
          streak++;
        } else {
          break;
        }
      }
    }

    // 現在の倍率
    let currentMultiplier = 1;
    for (const tier of STREAK_TIERS) {
      if (streak >= tier.day) currentMultiplier = tier.multiplier;
    }

    // 次のマイルストーン
    const nextMilestone = STREAK_TIERS.find((t) => t.milestone && t.day > streak) ?? null;

    // 報酬テーブル（UIが7日プログレスバーを描画するために使う）
    const weekProgress = Array.from({ length: 7 }, (_, i) => {
      const day = i + 1;
      const tier = STREAK_TIERS.find((t) => t.day === day);
      return {
        day,
        coins: Math.round(BASE_COINS * (tier?.multiplier ?? 1)),
        reached: day <= streak,
        isMilestone: tier?.milestone ?? false,
      };
    });

    return NextResponse.json({
      claimed,
      claimedAmount: todayBonus?.amount ?? null,
      streak,
      currentMultiplier,
      todayReward: Math.round(BASE_COINS * currentMultiplier),
      nextMilestone: nextMilestone
        ? {
            day: nextMilestone.day,
            multiplier: nextMilestone.multiplier,
            label: nextMilestone.label,
            daysLeft: nextMilestone.day - streak,
          }
        : null,
      weekProgress,
      tiers: STREAK_TIERS,
    });
  } catch (error) {
    logger.error('[daily-bonus/status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
