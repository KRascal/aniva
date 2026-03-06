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

/** ストリーク回復（コインで購入） — 損失回避+感情連動 */
export async function recoverStreak(
  relationshipId: string,
  userId: string,
  costCoins: number = 50,
): Promise<{ success: boolean; newStreak: number; error?: string }> {
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { streakDays: true, streakLastDate: true, characterId: true },
  });
  if (!rel) return { success: false, newStreak: 0, error: 'relationship_not_found' };

  // ストリークが途切れているか確認
  const todayJST = getJSTDateString();
  const yesterdayJST = getJSTDateString(new Date(Date.now() - 86400000));
  const lastJST = rel.streakLastDate ? getJSTDateString(rel.streakLastDate) : null;
  
  if (lastJST === todayJST || lastJST === yesterdayJST) {
    return { success: false, newStreak: rel.streakDays, error: 'streak_not_broken' };
  }

  // コイン残高確認
  const balance = await prisma.coinBalance.findUnique({
    where: { userId },
    select: { freeBalance: true, paidBalance: true },
  });
  const totalCoins = (balance?.freeBalance ?? 0) + (balance?.paidBalance ?? 0);
  if (totalCoins < costCoins) {
    return { success: false, newStreak: 0, error: 'insufficient_coins' };
  }

  // コイン消費（freeBalance優先）
  const freeDeduct = Math.min(balance?.freeBalance ?? 0, costCoins);
  const paidDeduct = costCoins - freeDeduct;
  
  await prisma.$transaction([
    prisma.coinBalance.update({
      where: { userId },
      data: {
        freeBalance: { decrement: freeDeduct },
        ...(paidDeduct > 0 ? { paidBalance: { decrement: paidDeduct } } : {}),
      },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        amount: -costCoins,
        type: 'SPEND',
        description: 'ストリーク回復チケット',
        metadata: { characterId: rel.characterId, recoveredStreak: rel.streakDays },
        balanceAfter: totalCoins - costCoins,
      },
    }),
    // ストリークを復元（昨日の日付にセット）
    prisma.relationship.update({
      where: { id: relationshipId },
      data: { streakLastDate: new Date(Date.now() - 86400000) },
    }),
  ]);

  return { success: true, newStreak: rel.streakDays };
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
