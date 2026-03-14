/**
 * anniversary-rewards.ts — 記念日リワード付与システム
 *
 * マイルストーン（日数/メッセージ数）に応じてコイン・通知を付与する。
 * 重複防止は CoinTransaction.refId を使用（UserDailyEventは日付ユニーク制約のため不使用）
 */

import { prisma } from './prisma';
import { logger } from './logger';

// マイルストーン報酬定義（日数ベース）
const MILESTONE_REWARDS: Record<number, { coins: number; message: string; gachaTicket?: number }> = {
  7: { coins: 10, message: '1週間記念' },
  14: { coins: 15, message: '2週間記念' },
  30: { coins: 30, message: '1ヶ月記念', gachaTicket: 1 },
  50: { coins: 50, message: '50日記念' },
  100: { coins: 100, message: '100日記念', gachaTicket: 3 },
  200: { coins: 150, message: '200日記念', gachaTicket: 5 },
  365: { coins: 365, message: '1年記念', gachaTicket: 10 },
};

// メッセージ数マイルストーン
const MESSAGE_REWARDS: Record<number, { coins: number; message: string; gachaTicket?: number }> = {
  50: { coins: 10, message: '50通記念' },
  100: { coins: 20, message: '100通記念' },
  500: { coins: 50, message: '500通記念' },
  1000: { coins: 100, message: '1000通記念' },
  5000: { coins: 500, message: '5000通記念' },
};

/**
 * 記念日リワードを付与する
 * - 重複防止: refId = `aniv_{type}_{milestone}_{characterId}_{YYYY-MM-DD}` で CoinTransaction を検索
 * - コイン付与 + 通知作成をトランザクションで実行
 */
export async function grantAnniversaryReward(
  userId: string,
  characterId: string,
  characterName: string,
  type: 'days' | 'messages',
  milestone: number,
): Promise<{ granted: boolean; reward?: { coins: number; message: string; gachaTicket?: number } }> {
  const rewardDef = type === 'days' ? MILESTONE_REWARDS[milestone] : MESSAGE_REWARDS[milestone];
  if (!rewardDef) return { granted: false };

  // 重複防止チェック: 今日付けで同じ refId の CoinTransaction が存在するか
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const refId = `aniv_${type}_${milestone}_${characterId}_${dateStr}`;

  const existing = await prisma.coinTransaction.findFirst({
    where: { userId, refId },
  });
  if (existing) {
    logger.info(`[AnniversaryRewards] Already granted for refId=${refId}, skipping`);
    return { granted: false };
  }

  try {
    // トランザクション: コイン付与 + 取引記録 + 通知
    await prisma.$transaction(async (tx) => {
      // コイン付与
      await tx.coinBalance.upsert({
        where: { userId },
        create: {
          userId,
          balance: rewardDef.coins,
          freeBalance: rewardDef.coins,
          paidBalance: 0,
        },
        update: {
          balance: { increment: rewardDef.coins },
          freeBalance: { increment: rewardDef.coins },
        },
      });

      // 取引記録（refId で重複防止）
      await tx.coinTransaction.create({
        data: {
          userId,
          type: 'BONUS',
          amount: rewardDef.coins,
          balanceAfter: 0, // 記録用（正確なbalanceAfterはupsert後に確定するため省略）
          characterId,
          refId,
          description: `${characterName}との${rewardDef.message}報酬`,
          metadata: {
            milestone,
            milestoneType: type,
            gachaTicket: rewardDef.gachaTicket ?? 0,
            source: 'anniversary_reward',
          },
        },
      });

      // 通知作成
      await tx.notification.create({
        data: {
          userId,
          type: 'ANNIVERSARY',
          title: `${characterName}との${rewardDef.message}！🎉`,
          body: `${rewardDef.coins}コインを獲得しました${
            rewardDef.gachaTicket ? `（+ガチャチケット${rewardDef.gachaTicket}枚）` : ''
          }`,
          characterId,
        },
      });
    });

    logger.info(
      `[AnniversaryRewards] Granted ${rewardDef.coins} coins for ${rewardDef.message} ` +
        `(${characterName} -> user ${userId}, refId=${refId})`
    );
    return { granted: true, reward: rewardDef };
  } catch (error) {
    logger.error('[AnniversaryRewards] Failed to grant reward:', error);
    return { granted: false };
  }
}

export { MILESTONE_REWARDS, MESSAGE_REWARDS };
