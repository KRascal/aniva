/**
 * デイリーログインボーナス API
 * POST /api/daily-bonus
 * - 今日まだボーナスを受け取っていなければコインを付与
 * - 連続ログイン日数に応じてボーナス倍率UP
 * - 記念日（anniversary）がある場合はボーナス2倍
 * - キャラクターからの一言メッセージも返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { apiLimiter, rateLimitResponse } from '@/lib/rate-limit';

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
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // ユーザー存在チェック（セッション残骸対策）
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const rl = await apiLimiter.check(userId)
    if (!rl.success) return rateLimitResponse(rl)

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

    // 記念日ボーナス判定: memorySummary.anniversaryContext が有効期限内かチェック
    let isAnniversaryBonus = false;
    let anniversaryCharacterName: string | null = null;
    try {
      const relationships = await prisma.relationship.findMany({
        where: { userId },
        select: {
          memorySummary: true,
          character: { select: { name: true } },
        },
      });

      const now = new Date();
      for (const rel of relationships) {
        const summary = rel.memorySummary as Record<string, unknown> | null;
        if (!summary) continue;
        const ctx = summary.anniversaryContext as { expiresAt?: string; label?: string } | undefined;
        if (ctx?.expiresAt && new Date(ctx.expiresAt) > now) {
          isAnniversaryBonus = true;
          anniversaryCharacterName = rel.character.name;
          break;
        }
      }
    } catch {
      // 記念日チェック失敗は無視（ボーナス自体は継続）
    }

    const streakMultiplier = getMultiplier(streak);
    const anniversaryMultiplier = isAnniversaryBonus ? 2 : 1;
    const multiplier = streakMultiplier * anniversaryMultiplier;
    const coins = Math.round(BASE_COINS * multiplier);

    // コイン付与（freeBalanceに加算 — 無料コイン扱い）
    let balance;
    try {
      balance = await prisma.coinBalance.upsert({
        where: { userId },
        create: { userId, balance: coins, freeBalance: coins, paidBalance: 0 },
        update: { balance: { increment: coins }, freeBalance: { increment: coins } },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        // ユーザーが存在しない（削除済みセッション残骸）
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }
      throw e;
    }

    await prisma.coinTransaction.create({
      data: {
        userId,
        type: 'BONUS',
        amount: coins,
        balanceAfter: balance.balance,
        description: `daily_login_streak_${streak}${isAnniversaryBonus ? '_anniversary2x' : ''}`,
        metadata: {
          source: 'login_bonus',
          coinType: 'free',
          streakMultiplier,
          anniversaryMultiplier,
          anniversaryCharacter: anniversaryCharacterName,
        },
      },
    });

    // メッセージ選択（記念日優先）
    const streakMessage = STREAK_MESSAGES[streak];
    let greeting: string;
    if (isAnniversaryBonus && anniversaryCharacterName) {
      greeting = `${anniversaryCharacterName}との記念日！ボーナス2倍だ！🎉💕`;
    } else {
      greeting = streakMessage || CHARACTER_GREETINGS[Math.floor(Math.random() * CHARACTER_GREETINGS.length)];
    }

    // 初回登録かチェック（BONUSトランザクションの件数で判定）
    const bonusCount = await prisma.coinTransaction.count({
      where: { userId, type: 'BONUS', description: { startsWith: 'daily_login' } },
    });
    const isFirstLogin = bonusCount <= 1; // 今のが初回

    // 初回登録ボーナス: 500コイン付与
    let welcomeBonusAwarded = false;
    let finalBalance = balance;
    if (isFirstLogin) {
      const WELCOME_BONUS = 500;
      // 既にウェルカムボーナスを受け取っていないか確認
      const alreadyWelcomed = await prisma.coinTransaction.findFirst({
        where: { userId, type: 'BONUS', description: 'welcome_bonus' },
      });
      if (!alreadyWelcomed) {
        finalBalance = await prisma.coinBalance.update({
          where: { userId },
          data: {
            balance: { increment: WELCOME_BONUS },
            freeBalance: { increment: WELCOME_BONUS },
          },
        });
        await prisma.coinTransaction.create({
          data: {
            userId,
            type: 'BONUS',
            amount: WELCOME_BONUS,
            balanceAfter: finalBalance.balance,
            description: 'welcome_bonus',
            metadata: { source: 'welcome_bonus', coinType: 'free' },
          },
        });
        welcomeBonusAwarded = true;
      }
    }

    return NextResponse.json({
      alreadyClaimed: false,
      awarded: true,
      amount: coins,
      coins,
      streak,
      streakDays: streak,
      streakBroken: !yesterdayBonus && streak === 1 && !isFirstLogin,
      multiplier,
      streakMultiplier,
      anniversaryMultiplier,
      isAnniversaryBonus,
      anniversaryCharacter: anniversaryCharacterName,
      totalBalance: (finalBalance ?? balance).freeBalance + (finalBalance ?? balance).paidBalance,
      isFirstLogin,
      welcomeAmount: 500,
      welcomeBonusAwarded,
      message: greeting,
      isStreakMilestone: !!streakMessage,
    });
  } catch (error) {
    console.error('[daily-bonus] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
