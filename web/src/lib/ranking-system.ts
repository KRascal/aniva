/**
 * ranking-system.ts — ランキングスコア管理
 * FC会員のチャット/通話 + 全員のギフティングをスコア化
 */

import { prisma } from './prisma';

// コイン換算レート
const SCORE_RATES = {
  CHAT_NON_FC: 1,       // 非FC: 1通 = 1スコア（ランキングに参加できる）
  CHAT_FC: 3,           // FC: 1通 = 3スコア（FC優遇）
  CALL_NON_FC: 3,       // 非FC: 1分 = 3スコア
  CALL_FC_PER_MIN: 10,  // FC: 1分 = 10スコア
  GIFT: 1,              // ギフティング: 1円 = 1スコア
  LOGIN_NON_FC: 5,
  LOGIN_FC: 10,
} as const;

function getPeriod(type: 'monthly' | 'weekly' | 'alltime'): string {
  const now = new Date();
  if (type === 'alltime') return 'alltime';
  if (type === 'weekly') {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function upsertScore(
  userId: string,
  characterId: string,
  periodType: 'monthly' | 'weekly' | 'alltime',
  delta: { chat?: number; call?: number; gift?: number }
) {
  const period = getPeriod(periodType);
  const total = (delta.chat ?? 0) + (delta.call ?? 0) + (delta.gift ?? 0);
  if (total === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).rankingScore.upsert({
    where: { userId_characterId_period_periodType: { userId, characterId, period, periodType } },
    create: {
      userId,
      characterId,
      period,
      periodType,
      chatScore: delta.chat ?? 0,
      callScore: delta.call ?? 0,
      giftScore: delta.gift ?? 0,
      totalScore: total,
    },
    update: {
      chatScore: { increment: delta.chat ?? 0 },
      callScore: { increment: delta.call ?? 0 },
      giftScore: { increment: delta.gift ?? 0 },
      totalScore: { increment: total },
    },
  });
}

/**
 * チャットメッセージのランキングスコア加算
 * FC会員のみ加算
 */
export async function addChatScore(userId: string, characterId: string, isFcMember: boolean) {
  const score = isFcMember ? SCORE_RATES.CHAT_FC : SCORE_RATES.CHAT_NON_FC;
  if (!score) return;

  await Promise.all([
    upsertScore(userId, characterId, 'monthly', { chat: score }),
    upsertScore(userId, characterId, 'weekly', { chat: score }),
    upsertScore(userId, characterId, 'alltime', { chat: score }),
  ]);
}

/**
 * 通話時間のランキングスコア加算
 * FC会員のみ加算
 */
export async function addCallScore(userId: string, characterId: string, isFcMember: boolean, durationMinutes: number) {
  const score = isFcMember ? SCORE_RATES.CALL_FC_PER_MIN * durationMinutes : 0;
  if (score === 0) return;

  await Promise.all([
    upsertScore(userId, characterId, 'monthly', { call: score }),
    upsertScore(userId, characterId, 'weekly', { call: score }),
    upsertScore(userId, characterId, 'alltime', { call: score }),
  ]);
}

/**
 * ギフティングのランキングスコア加算
 * FC/非FC問わず加算
 */
export async function addGiftScore(userId: string, characterId: string, amountJpy: number) {
  if (amountJpy <= 0) return;

  await Promise.all([
    upsertScore(userId, characterId, 'monthly', { gift: amountJpy }),
    upsertScore(userId, characterId, 'weekly', { gift: amountJpy }),
    upsertScore(userId, characterId, 'alltime', { gift: amountJpy }),
  ]);
}
