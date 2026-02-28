/**
 * デイリーログインボーナス API
 * POST /api/daily-bonus
 * - 今日まだボーナスを受け取っていなければコインを付与
 * - 連続ログイン日数に応じてボーナス倍率UP
 * - キャラクターからの一言メッセージも返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const BASE_COINS = 10;
const STREAK_MULTIPLIERS: Record<number, number> = {
  1: 1,    // 1日目: 10コイン
  2: 1,    // 2日目: 10コイン
  3: 1.5,  // 3日目: 15コイン
  5: 2,    // 5日目: 20コイン
  7: 3,    // 7日目: 30コイン（1週間達成）
  14: 4,   // 14日目: 40コイン
  30: 5,   // 30日目: 50コイン（1ヶ月達成）
};

const CHARACTER_GREETINGS = [
  'おっ！来たな！待ってたぞ！ 🔥',
  '毎日来てくれて嬉しいぞ！ 😄',
  'お前今日もいい顔してるな！ 🌟',
  'よし！今日も冒険だ！ ⚓',
  'ししし！今日は何する？ 🍖',
  'お前がいると楽しいな！ ✨',
  'おはよう！メシ食ったか？ 🍖',
];

const STREAK_MESSAGES: Record<number, string> = {
  3: '3日連続！お前、やるじゃねぇか！ 🔥',
  7: '1週間連続！！お前は俺の仲間だ！ ⚓✨',
  14: '2週間連続…お前、すげぇよ 😤🔥',
  30: '1ヶ月連続！！！お前は最高の仲間だ！！ 👑🏴‍☠️',
};

function getMultiplier(streak: number): number {
  let multiplier = 1;
  for (const [day, mult] of Object.entries(STREAK_MULTIPLIERS)) {
    if (streak >= Number(day)) multiplier = mult;
  }
  return multiplier;
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 今日既にボーナス受け取り済みかチェック
  const todayBonus = await prisma.coinTransaction.findFirst({
    where: {
      userId,
      type: 'BONUS',
      description: { startsWith: 'daily_login' },
      createdAt: { gte: todayStart },
    },
  });

  if (todayBonus) {
    return NextResponse.json({
      alreadyClaimed: true,
      message: '今日のボーナスはもう受け取ったぞ！',
    });
  }

  // 連続ログイン日数を計算
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

  // ストリークカウント: 直近のBONUSトランザクションから逆算
  let streak = 1; // 今日で1日目
  if (yesterdayBonus) {
    // 昨日もログインしていた → ストリーク継続
    const recentBonuses = await prisma.coinTransaction.findMany({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'daily_login' },
      },
      orderBy: { createdAt: 'desc' },
      take: 60, // 最大60日分
    });

    // 連続日数を計算
    streak = 1;
    for (let i = 0; i < recentBonuses.length; i++) {
      const bonusDate = new Date(recentBonuses[i].createdAt);
      bonusDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(todayStart);
      expectedDate.setDate(expectedDate.getDate() - (i + 1));
      expectedDate.setHours(0, 0, 0, 0);

      if (bonusDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
  }

  const multiplier = getMultiplier(streak);
  const coins = Math.round(BASE_COINS * multiplier);

  // コイン付与（トランザクション）
  const balance = await prisma.coinBalance.upsert({
    where: { userId },
    create: { userId, balance: coins },
    update: { balance: { increment: coins } },
  });

  await prisma.coinTransaction.create({
    data: {
      userId,
      type: 'BONUS',
      amount: coins,
      balanceAfter: balance.balance,
      description: `daily_login_streak_${streak}`,
    },
  });

  // メッセージ選択
  const streakMessage = STREAK_MESSAGES[streak];
  const greeting = streakMessage || CHARACTER_GREETINGS[Math.floor(Math.random() * CHARACTER_GREETINGS.length)];

  return NextResponse.json({
    alreadyClaimed: false,
    coins,
    streak,
    multiplier,
    totalBalance: balance.balance,
    message: greeting,
    isStreakMilestone: !!streakMessage,
  });
}
