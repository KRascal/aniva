/**
 * デイリーレア判定システム
 * ログイン時に確率判定: normal(85%) / good(10%) / rare(4%) / super_rare(1%)
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export type DailyEventType = 'normal' | 'good' | 'rare' | 'super_rare';

export interface DailyEventReward {
  coins?: number;
  message?: string;
  effect?: string;
}

export interface DailyEventResult {
  eventType: DailyEventType;
  isNew: boolean;
  reward: DailyEventReward;
  displayData: {
    title: string;
    description: string;
    animation: string;
    color: string;
  };
}

function getJSTDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function rollEventType(): DailyEventType {
  const rand = Math.random() * 100;
  if (rand < 1) return 'super_rare';
  if (rand < 5) return 'rare';
  if (rand < 15) return 'good';
  return 'normal';
}

const EVENT_DISPLAY: Record<DailyEventType, { title: string; description: string; animation: string; color: string }> = {
  normal: {
    title: '今日も元気！',
    description: 'いつも通りの一日が始まる。',
    animation: 'none',
    color: '#6b7280',
  },
  good: {
    title: '今日はいい気分！',
    description: 'なんだか今日はいい予感がする…',
    animation: 'sparkle',
    color: '#10b981',
  },
  rare: {
    title: '✨ レアデー！',
    description: '特別な何かが起きる予感…',
    animation: 'glow',
    color: '#8b5cf6',
  },
  super_rare: {
    title: '🌟 超レアデー！！',
    description: '今日は絶対に忘れられない一日になる！',
    animation: 'rainbow',
    color: '#f59e0b',
  },
};

const EVENT_REWARDS: Record<DailyEventType, DailyEventReward> = {
  normal: {},
  good: { coins: 5, message: '今日はいいことありそう！' },
  rare: { coins: 15, message: '今日は特別な日かも…', effect: 'glow' },
  super_rare: { coins: 50, message: '今日は特別中の特別！', effect: 'rainbow' },
};

export async function getUserDailyEvent(userId: string): Promise<DailyEventResult> {
  const today = getJSTDateString();

  // Guard: if UserDailyEvent table doesn't exist yet (migration pending), return normal event
  let existing;
  try {
    existing = await prisma.userDailyEvent.findFirst({
      where: { userId, date: new Date(today) },
    });
  } catch {
    // DB migration not yet applied — gracefully return normal event
    return {
      eventType: 'normal',
      isNew: false,
      reward: {},
      displayData: EVENT_DISPLAY['normal'],
    };
  }

  if (existing) {
    const eventType = existing.eventType as DailyEventType;
    return {
      eventType,
      isNew: false,
      reward: existing.reward as DailyEventReward,
      displayData: EVENT_DISPLAY[eventType],
    };
  }

  const eventType = rollEventType();
  const reward = EVENT_REWARDS[eventType];

  try {
    await prisma.userDailyEvent.create({
      data: {
        userId,
        date: new Date(today),
        eventType,
        reward: reward as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Silently skip if table not yet available
  }

  if (reward.coins) {
    await prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: reward.coins, freeBalance: reward.coins, paidBalance: 0 },
      update: { balance: { increment: reward.coins }, freeBalance: { increment: reward.coins } },
    });
  }

  return {
    eventType,
    isNew: true,
    reward,
    displayData: EVENT_DISPLAY[eventType],
  };
}
