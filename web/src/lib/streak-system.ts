/**
 * ストリーク（連続会話）システム
 * エンダウメント効果: 積み上げたものを失いたくない
 */

import { prisma } from '@/lib/prisma';

/** JST日付文字列を返す */
function getJSTDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/** ストリークを更新（チャット送信時に呼ぶ） */
export async function updateStreak(relationshipId: string): Promise<{ streakDays: number; isNew: boolean; milestone: number | null }> {
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { streakDays: true, streakLastDate: true },
  });
  if (!rel) return { streakDays: 0, isNew: false, milestone: null };

  const todayJST = getJSTDateString();
  const lastDateJST = rel.streakLastDate ? getJSTDateString(rel.streakLastDate) : null;

  // 既に今日更新済み
  if (lastDateJST === todayJST) {
    return { streakDays: rel.streakDays, isNew: false, milestone: null };
  }

  // 昨日だった場合: ストリーク継続
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayJST = getJSTDateString(yesterday);

  let newStreak: number;
  if (lastDateJST === yesterdayJST) {
    newStreak = rel.streakDays + 1;
  } else {
    // ストリークリセット（2日以上空いた or 初回）
    newStreak = 1;
  }

  await prisma.relationship.update({
    where: { id: relationshipId },
    data: { streakDays: newStreak, streakLastDate: new Date() },
  });

  // マイルストーン判定
  const milestones = [7, 30, 100, 365];
  const milestone = milestones.includes(newStreak) ? newStreak : null;

  return { streakDays: newStreak, isNew: true, milestone };
}

/** ストリーク情報を取得 */
export async function getStreak(relationshipId: string): Promise<{ streakDays: number; isActive: boolean }> {
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { streakDays: true, streakLastDate: true },
  });
  if (!rel) return { streakDays: 0, isActive: false };

  const todayJST = getJSTDateString();
  const yesterdayJST = getJSTDateString(new Date(Date.now() - 86400000));
  const lastJST = rel.streakLastDate ? getJSTDateString(rel.streakLastDate) : null;

  const isActive = lastJST === todayJST || lastJST === yesterdayJST;
  return { streakDays: isActive ? rel.streakDays : 0, isActive };
}

/** ストリーク途切れユーザーを取得（cron用） */
export async function getBrokenStreaks(): Promise<Array<{ relationshipId: string; characterName: string; previousStreak: number }>> {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const broken = await prisma.relationship.findMany({
    where: {
      streakDays: { gte: 3 }, // 3日以上のストリークが途切れた場合のみ
      streakLastDate: { lt: twoDaysAgo },
    },
    select: {
      id: true,
      streakDays: true,
      character: { select: { name: true } },
    },
  });

  return broken.map(r => ({
    relationshipId: r.id,
    characterName: r.character.name,
    previousStreak: r.streakDays,
  }));
}
