/**
 * ユーザーアクティビティ時間帯トラッカー
 * ユーザーが最もアクティブな時間帯を学習し、DM送信の最適タイミングを判定
 */

import { prisma } from './prisma';

/** JST時間を取得 */
function getJSTHour(): number {
  return (new Date().getUTCHours() + 9) % 24;
}

/** ユーザーの過去30日のメッセージ時間帯分布を取得 */
export async function getUserActivityHours(userId: string): Promise<Record<number, number>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const messages = await prisma.message.findMany({
    where: {
      role: 'USER',
      conversation: {
        relationship: { userId },
      },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
  });

  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;

  for (const msg of messages) {
    const jstHour = (msg.createdAt.getUTCHours() + 9) % 24;
    hourCounts[jstHour]++;
  }

  return hourCounts;
}

/** ユーザーのピークアクティビティ時間帯（上位3時間）を返す */
export async function getPeakHours(userId: string): Promise<number[]> {
  const hours = await getUserActivityHours(userId);
  return Object.entries(hours)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([h]) => Number(h));
}

/** 今がDM送信の最適タイミングかを判定 */
export async function isOptimalDMTime(userId: string): Promise<{ optimal: boolean; reason: string }> {
  const currentHour = getJSTHour();

  // 深夜(1-6時)は基本NG
  if (currentHour >= 1 && currentHour < 6) {
    return { optimal: false, reason: 'deep_night' };
  }

  const peakHours = await getPeakHours(userId);
  
  // データ不足の場合はデフォルト時間帯（8時/13時/20時前後）で許可
  if (peakHours.every((h) => h === 0)) {
    const defaultHours = [8, 9, 12, 13, 19, 20, 21];
    return {
      optimal: defaultHours.includes(currentHour),
      reason: defaultHours.includes(currentHour) ? 'default_schedule' : 'off_schedule',
    };
  }

  // ピーク時間帯 ±1時間以内なら最適
  const isNearPeak = peakHours.some((h) => Math.abs(h - currentHour) <= 1 || Math.abs(h - currentHour) >= 23);
  return {
    optimal: isNearPeak,
    reason: isNearPeak ? `near_peak_${peakHours[0]}h` : `off_peak`,
  };
}
