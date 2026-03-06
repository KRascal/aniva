/**
 * variable-reward-system.ts
 * 変動報酬エンジン — 変動比率スケジュールに基づくデイリーイベントシステム
 *
 * 確率分布:
 *   通常日    (85%): null 返却
 *   良い日    (10%): { type: "good" }
 *   レア日    ( 4%): { type: "rare" }
 *   超レア日  ( 1%): { type: "ultra_rare" }
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ============================================================
// 型定義
// ============================================================

export type VariableRewardEventType = 'good' | 'rare' | 'ultra_rare';

export interface DailyEventBonus {
  bonusCoins: number;
  bonusXpMultiplier: number;
}

export interface DailyEventPayload {
  type: VariableRewardEventType;
  rarity: 'good' | 'rare' | 'ultra_rare';
  message: string;
  bonusCoins: number;
  bonusXpMultiplier: number;
}

export interface RollDailyEventResult {
  event: DailyEventPayload | null; // null = 通常日
  isNew: boolean;
}

// ============================================================
// 定数定義
// ============================================================

/** イベントタイプ別のデフォルトメッセージ */
const EVENT_MESSAGES: Record<VariableRewardEventType, string> = {
  good: 'キャラのテンション特別高い',
  rare: '限定エピソード解放',
  ultra_rare: '手書き風メッセージ+限定壁紙',
};

/** イベントタイプ別ボーナス */
const EVENT_BONUSES: Record<VariableRewardEventType, DailyEventBonus> = {
  good: {
    bonusCoins: 10,
    bonusXpMultiplier: 1.5,
  },
  rare: {
    bonusCoins: 30,
    bonusXpMultiplier: 2.0,
  },
  ultra_rare: {
    bonusCoins: 100,
    bonusXpMultiplier: 3.0,
  },
};

// ============================================================
// ユーティリティ
// ============================================================

/** JSTの日付文字列を返す (YYYY-MM-DD) */
function getJSTDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * 確率に基づいてイベントタイプをロールする
 * 通常日(85%) = null, 良い日(10%), レア日(4%), 超レア日(1%)
 */
function rollEventType(): VariableRewardEventType | null {
  const rand = Math.random() * 100;
  if (rand < 1) return 'ultra_rare';   // 0〜1%
  if (rand < 5) return 'rare';         // 1〜5%
  if (rand < 15) return 'good';        // 5〜15%
  return null;                          // 15〜100% (通常日)
}

// ============================================================
// パブリック API
// ============================================================

/**
 * rollDailyEvent — ログイン/チャット開始時に判定
 *
 * - 当日すでにイベントが確定していれば再ロールせず既存を返す
 * - 通常日なら null を返す
 */
export async function rollDailyEvent(
  userId: string,
  _characterId: string, // 将来のキャラ別確率変動用に保持
): Promise<RollDailyEventResult> {
  const today = getJSTDateString();

  // 重複防止: 本日のイベントが既に存在するか確認
  let existing;
  try {
    existing = await prisma.userDailyEvent.findFirst({
      where: { userId, date: today },
    });
  } catch {
    // DBマイグレーション未適用などの場合はフォールバック
    return { event: null, isNew: false };
  }

  if (existing) {
    const storedType = existing.eventType as string;
    // 通常日は null 返却
    if (storedType === 'normal') {
      return { event: null, isNew: false };
    }
    const eventType = storedType as VariableRewardEventType;
    const bonus = EVENT_BONUSES[eventType] ?? { bonusCoins: 0, bonusXpMultiplier: 1.0 };
    const storedReward = existing.reward as Record<string, unknown>;
    return {
      event: {
        type: eventType,
        rarity: eventType,
        message: (storedReward?.message as string) ?? EVENT_MESSAGES[eventType],
        bonusCoins: bonus.bonusCoins,
        bonusXpMultiplier: bonus.bonusXpMultiplier,
      },
      isNew: false,
    };
  }

  // 新規ロール
  const eventType = rollEventType();
  const eventTypeStr = eventType ?? 'normal';

  try {
    const rewardData: Record<string, unknown> = eventType
      ? {
          message: EVENT_MESSAGES[eventType],
          ...EVENT_BONUSES[eventType],
        }
      : {};

    await prisma.userDailyEvent.create({
      data: {
        userId,
        date: today,
        eventType: eventTypeStr,
        reward: rewardData as Prisma.InputJsonValue,
      },
    });

    // コインボーナスを付与
    if (eventType) {
      const coins = EVENT_BONUSES[eventType].bonusCoins;
      if (coins > 0) {
        await prisma.coinBalance.upsert({
          where: { userId },
          create: { userId, freeBalance: coins, balance: coins },
          update: { freeBalance: { increment: coins }, balance: { increment: coins } },
        });
      }
    }
  } catch {
    // エラーは握り潰す（ゲームループを止めない）
  }

  if (!eventType) {
    return { event: null, isNew: true };
  }

  const bonus = EVENT_BONUSES[eventType];
  return {
    event: {
      type: eventType,
      rarity: eventType,
      message: EVENT_MESSAGES[eventType],
      bonusCoins: bonus.bonusCoins,
      bonusXpMultiplier: bonus.bonusXpMultiplier,
    },
    isNew: true,
  };
}

/**
 * getUserDailyEvent — 本日のイベントを確認（ロールしない）
 *
 * @param userId  ユーザーID
 * @param date    日付文字列 "YYYY-MM-DD"（省略時: 今日）
 * @returns イベントペイロード。未確定 or 通常日は null
 */
export async function getUserDailyEvent(
  userId: string,
  date?: string,
): Promise<DailyEventPayload | null> {
  const targetDate = date ?? getJSTDateString();

  let record;
  try {
    record = await prisma.userDailyEvent.findFirst({
      where: { userId, date: targetDate },
    });
  } catch {
    return null;
  }

  if (!record || record.eventType === 'normal') return null;

  const eventType = record.eventType as VariableRewardEventType;
  const bonus = EVENT_BONUSES[eventType] ?? { bonusCoins: 0, bonusXpMultiplier: 1.0 };
  const storedReward = record.reward as Record<string, unknown>;

  return {
    type: eventType,
    rarity: eventType,
    message: (storedReward?.message as string) ?? EVENT_MESSAGES[eventType],
    bonusCoins: bonus.bonusCoins,
    bonusXpMultiplier: bonus.bonusXpMultiplier,
  };
}

/**
 * getEventBonus — イベントタイプ別ボーナスを取得
 */
export function getEventBonus(eventType: VariableRewardEventType): DailyEventBonus {
  return EVENT_BONUSES[eventType] ?? { bonusCoins: 0, bonusXpMultiplier: 1.0 };
}

/**
 * getEventMessage — イベントタイプ別メッセージを取得
 */
export function getEventMessage(eventType: VariableRewardEventType): string {
  return EVENT_MESSAGES[eventType];
}
