/**
 * FollowUpScheduler — ユーザー理解エンジン
 *
 * ProfileExtractorが抽出したフォローアップ必要事項をキューに保存し、
 * 適切なタイミングでDecisionEngineに提供する。
 */

import { prisma } from '../prisma';
import { logger } from '../logger';
import type { ProfileExtraction } from '../engine/profile-extractor';

// ── dueDate計算ヘルパー ────────────────────────────────────────

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0); // 朝9時を基準に
  return d;
}

function getDueDateFromTiming(timing: 'next_session' | '3_days' | '1_week'): Date {
  switch (timing) {
    case 'next_session':
      return addDays(1);
    case '3_days':
      return addDays(3);
    case '1_week':
      return addDays(7);
    default:
      return addDays(3);
  }
}

// ── 公開API ───────────────────────────────────────────────────

/**
 * ProfileExtractorの出力からFollowUpQueueを作成する
 * 重複チェック: 同userId + characterId + topic + status=pending の場合はスキップ
 */
export async function scheduleFollowUps(
  userId: string,
  characterId: string,
  followUpNeeded: ProfileExtraction['followUpNeeded'],
): Promise<void> {
  if (!followUpNeeded || followUpNeeded.length === 0) return;

  for (const item of followUpNeeded) {
    try {
      // 重複チェック
      const existing = await prisma.followUpQueue.findFirst({
        where: {
          userId,
          characterId,
          topic: item.topic,
          status: 'pending',
        },
      });

      if (existing) {
        logger.debug(`[FollowUpScheduler] Skip duplicate: ${item.topic}`);
        continue;
      }

      const dueDate = getDueDateFromTiming(item.suggestedTiming);

      await prisma.followUpQueue.create({
        data: {
          userId,
          characterId,
          topic: item.topic,
          reason: item.reason,
          dueDate,
          status: 'pending',
          source: 'profile_extractor',
        },
      });

      logger.info(`[FollowUpScheduler] Scheduled: "${item.topic}" for ${dueDate.toISOString()}`);
    } catch (e) {
      logger.error(`[FollowUpScheduler] Failed to schedule follow-up for topic "${item.topic}":`, e);
    }
  }
}

/**
 * 今日以前のdueDate + status=pending のフォローアップを取得（最大3件）
 */
export async function getActiveFollowUps(
  characterId: string,
  userId: string,
): Promise<{ id: string; topic: string; reason: string }[]> {
  try {
    const now = new Date();
    // 今日の終わり（23:59:59）までのdueDateを対象とする
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const items = await prisma.followUpQueue.findMany({
      where: {
        characterId,
        userId,
        status: 'pending',
        dueDate: { lte: endOfToday },
      },
      orderBy: { dueDate: 'asc' },
      take: 3,
      select: { id: true, topic: true, reason: true },
    });

    return items;
  } catch (e) {
    logger.error('[FollowUpScheduler] getActiveFollowUps failed:', e);
    return [];
  }
}

/**
 * フォローアップをsent状態に更新する
 */
export async function markAsSent(followUpId: string): Promise<void> {
  try {
    await prisma.followUpQueue.update({
      where: { id: followUpId },
      data: { status: 'sent' },
    });
    logger.info(`[FollowUpScheduler] Marked as sent: ${followUpId}`);
  } catch (e) {
    logger.error(`[FollowUpScheduler] markAsSent failed for ${followUpId}:`, e);
  }
}

/**
 * ユーザーの誕生日が今日ならバースデーフォローアップを作成する
 */
export async function scheduleBirthdayFollowUp(
  userId: string,
  characterId: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { birthday: true, nickname: true, displayName: true },
    });

    if (!user?.birthday) return;

    // birthday format: "YYYY-MM-DD"
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayMD = `${mm}-${dd}`;

    // birthday の末尾 "MM-DD" と一致するか確認
    const birthdayMD = user.birthday.slice(5); // "YYYY-MM-DD" → "MM-DD"
    if (birthdayMD !== todayMD) return;

    const userName = user.nickname ?? user.displayName ?? 'あなた';

    // 重複チェック
    const existing = await prisma.followUpQueue.findFirst({
      where: {
        userId,
        characterId,
        source: 'birthday',
        status: 'pending',
        dueDate: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });

    if (existing) {
      logger.debug(`[FollowUpScheduler] Birthday follow-up already exists for user ${userId}`);
      return;
    }

    const dueDate = new Date();
    dueDate.setHours(10, 0, 0, 0); // 当日10時に送る

    await prisma.followUpQueue.create({
      data: {
        userId,
        characterId,
        topic: '誕生日',
        reason: `今日は${userName}さんの誕生日。お祝いのメッセージを送ろう。`,
        dueDate,
        status: 'pending',
        source: 'birthday',
      },
    });

    logger.info(`[FollowUpScheduler] Birthday follow-up scheduled for user ${userId}`);
  } catch (e) {
    logger.error('[FollowUpScheduler] scheduleBirthdayFollowUp failed:', e);
  }
}

/**
 * dueDate + 7日を超過したpending→expiredに更新する
 */
export async function expireOldFollowUps(): Promise<number> {
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 7);

    const result = await prisma.followUpQueue.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: threshold },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      logger.info(`[FollowUpScheduler] Expired ${result.count} old follow-ups`);
    }

    return result.count;
  } catch (e) {
    logger.error('[FollowUpScheduler] expireOldFollowUps failed:', e);
    return 0;
  }
}
