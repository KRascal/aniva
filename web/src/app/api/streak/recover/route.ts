/**
 * ストリーク回復チケットAPI
 * POST /api/streak/recover
 * - 50コインでストリークを1日分復活
 * - 当日中（ストリーク切れ直後）のみ使用可能
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const RECOVERY_COST = 50;

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // 残高チェック
    const balance = await prisma.coinBalance.findUnique({ where: { userId } });
    const totalBalance = (balance?.freeBalance ?? 0) + (balance?.paidBalance ?? 0);
    if (totalBalance < RECOVERY_COST) {
      return NextResponse.json({
        error: 'INSUFFICIENT_COINS',
        message: `コインが足りません（必要: ${RECOVERY_COST}コイン、所持: ${totalBalance}コイン）`,
        required: RECOVERY_COST,
        current: totalBalance,
      }, { status: 402 });
    }

    // 今日のログインボーナスを確認
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayBonus = await prisma.coinTransaction.findFirst({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'daily_login' },
        createdAt: { gte: todayStart },
      },
    });

    if (!todayBonus) {
      return NextResponse.json({
        error: 'NO_BONUS_TODAY',
        message: 'まずログインボーナスを受け取ってください',
      }, { status: 400 });
    }

    // 既にリカバリ済みか
    const alreadyRecovered = await prisma.coinTransaction.findFirst({
      where: {
        userId,
        type: 'PURCHASE',
        description: 'streak_recovery',
        createdAt: { gte: todayStart },
      },
    });

    if (alreadyRecovered) {
      return NextResponse.json({
        error: 'ALREADY_RECOVERED',
        message: '今日は既にストリークを回復済みです',
      }, { status: 400 });
    }

    // 昨日ログインしていたかチェック（ストリークが切れていなければ回復不要）
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayBonus = await prisma.coinTransaction.findFirst({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'daily_login' },
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
    });

    if (yesterdayBonus) {
      return NextResponse.json({
        error: 'STREAK_NOT_BROKEN',
        message: 'ストリークは途切れていません！',
      }, { status: 400 });
    }

    // 一昨日からストリークを遡って計算
    const twoDaysAgoStart = new Date(yesterdayStart);
    twoDaysAgoStart.setDate(twoDaysAgoStart.getDate() - 1);

    const recentBonuses = await prisma.coinTransaction.findMany({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'daily_login' },
        createdAt: { lt: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    // 一昨日以前の連続日数を計算
    let recoveredStreak = 1; // 一昨日の1日分
    for (let i = 0; i < recentBonuses.length; i++) {
      const bonusDate = new Date(recentBonuses[i].createdAt);
      bonusDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(twoDaysAgoStart);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (bonusDate.getTime() === expectedDate.getTime()) {
        recoveredStreak++;
      } else {
        break;
      }
    }

    // +1 for today, +1 for recovered yesterday
    const newStreak = recoveredStreak + 1;

    // コイン消費（free優先）
    const freeDeduct = Math.min(balance!.freeBalance, RECOVERY_COST);
    const paidDeduct = RECOVERY_COST - freeDeduct;

    const updatedBalance = await prisma.coinBalance.update({
      where: { userId },
      data: {
        balance: { decrement: RECOVERY_COST },
        freeBalance: { decrement: freeDeduct },
        paidBalance: { decrement: paidDeduct },
      },
    });

    // トランザクション記録
    await prisma.coinTransaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        amount: -RECOVERY_COST,
        balanceAfter: updatedBalance.balance,
        description: 'streak_recovery',
        metadata: {
          source: 'streak_recovery',
          recoveredStreak: newStreak,
          coinType: freeDeduct > 0 ? 'free' : 'paid',
        },
      },
    });

    // 昨日分のダミーボーナス記録を挿入（ストリーク計算の整合性のため）
    const yesterdayMid = new Date(yesterdayStart);
    yesterdayMid.setHours(12, 0, 0, 0);

    await prisma.coinTransaction.create({
      data: {
        userId,
        type: 'BONUS',
        amount: 0,
        balanceAfter: updatedBalance.balance,
        description: `daily_login_streak_${recoveredStreak}_recovered`,
        metadata: { source: 'streak_recovery', recovered: true },
        createdAt: yesterdayMid,
      },
    });

    return NextResponse.json({
      success: true,
      recoveredStreak: newStreak,
      cost: RECOVERY_COST,
      remainingBalance: updatedBalance.freeBalance + updatedBalance.paidBalance,
      message: `ストリークが${newStreak}日に復活した！🔥`,
    });
  } catch (error) {
    console.error('[streak/recover] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
