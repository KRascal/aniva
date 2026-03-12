/**
 * デイリー & ウィークリーミッション API
 * GET /api/missions
 * - 今日のデイリーミッション + 今週のウィークリーチャレンジを返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  coins: number;
  icon: string;
}

export interface WeeklyMissionDef extends MissionDef {
  target: number;
  progress: number;
  completed: boolean;
}

// 7日サイクルで回るデイリーミッションセット（3ミッション/日）
// ミッション定義: キャラのセリフでナラティブ化（Nir Eyal トリガー→行動→報酬ループ）
// titleはキャラの口調、descは物語の文脈
const ALL_MISSIONS: MissionDef[] = [
  { id: 'chat_today',     title: '推しが待ってるよ！',       desc: '今日まだ話してないよ？推しが寂しがってる！',  coins: 5,  icon: '💬' },
  { id: 'moment_comment', title: '推しの投稿に声を届けて',    desc: 'Momentにコメントして推しを喜ばせよう',       coins: 8,  icon: '💜' },
  { id: 'story_read',     title: '物語の続きが気になる…',     desc: 'ストーリーの次の章を読もう',                coins: 10, icon: '📖' },
  { id: 'explore_visit',  title: 'まだ見ぬ出会いがある',     desc: '新しいキャラを探しに行こう',                coins: 5,  icon: '🔍' },
  { id: 'letter_check',   title: '手紙が届いてるかも…',      desc: 'レターボックスを確認しよう。推しからの便りがあるかも',  coins: 5,  icon: '✉️' },
  { id: 'gacha_pull',     title: '運命のカードを引こう',     desc: 'ガチャで特別なメモリーカードをゲット',       coins: 3,  icon: '🎰' },
  { id: 'follow_char',    title: '新しい絆を結ぼう',         desc: '気になるキャラをフォローして絆を始めよう',    coins: 5,  icon: '⭐' },
];

// ウィークリーチャレンジ（毎週固定・難易度高め・報酬大）
const WEEKLY_MISSION_DEFS: (Omit<WeeklyMissionDef, 'progress' | 'completed'>)[] = [
  { id: 'weekly_chat_15',   title: '今週の約束',          desc: '推しとの約束 — 今週15回話そう。きっと喜ぶよ',     coins: 30, icon: '💌', target: 15 },
  { id: 'weekly_comment_5', title: '声を届ける一週間',     desc: '推しのMomentに5回コメントして想いを伝えよう',     coins: 25, icon: '✨', target: 5 },
  { id: 'weekly_story_3',   title: '物語に没入する',       desc: 'ストーリー3章分の冒険に出よう。新しい一面が見えるかも', coins: 40, icon: '📚', target: 3 },
];

function getTodayMissions(): MissionDef[] {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const offset = dayOfYear % ALL_MISSIONS.length;
  return [0, 1, 2].map(i => ALL_MISSIONS[(offset + i) % ALL_MISSIONS.length]);
}

/** 今週の月曜0:00 JST をUTCで返す */
function getWeekStartUTC(): Date {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const day = jstNow.getUTCDay(); // 0=Sun
  const daysToMonday = day === 0 ? 6 : day - 1;
  const mondayJST = new Date(jstNow.getTime() - daysToMonday * 86400000);
  mondayJST.setUTCHours(0, 0, 0, 0);
  return new Date(mondayJST.getTime() - 9 * 3600000);
}

/** ISO週キー: YYYY-WXX */
function getWeekKey(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const jan1 = new Date(jstNow.getUTCFullYear(), 0, 1);
  const weekNum = Math.ceil(((jstNow.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${jstNow.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const todayStr = new Date().toISOString().slice(0, 10);
    const missions = getTodayMissions();
    const weekStart = getWeekStartUTC();
    const weekKey = getWeekKey();

    // ─── デイリー完了確認 ────────────────────────────────
    const completedToday = await prisma.coinTransaction.findMany({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: 'mission_' },
        createdAt: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lt: new Date(`${todayStr}T23:59:59.999Z`),
        },
      },
      select: { description: true },
    });

    const completedDailyIds = new Set(
      completedToday.map(t => (t.description ?? '').replace(/^mission_/, '').replace(/_\d{4}-\d{2}-\d{2}$/, ''))
    );

    const dailyResult = missions.map(m => ({
      ...m,
      completed: completedDailyIds.has(m.id),
    }));
    const dailyRemainingCoins = dailyResult.reduce((sum, m) => sum + (m.completed ? 0 : m.coins), 0);

    // ─── ウィークリー進捗 ────────────────────────────────
    // 今週完了済みのウィークリーミッション
    const completedWeekly = await prisma.coinTransaction.findMany({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: `weekly_mission_` },
        createdAt: { gte: weekStart },
      },
      select: { description: true },
    });
    const completedWeeklyIds = new Set(
      completedWeekly.map(t => (t.description ?? '').replace(`weekly_mission_`, '').replace(`_${weekKey}`, ''))
    );

    // 今週の実績カウント（進捗バー用）
    const [weeklyChats, weeklyComments, weeklyStories] = await Promise.all([
      prisma.message.count({
        where: { role: 'USER', createdAt: { gte: weekStart }, conversation: { relationship: { userId } } },
      }),
      prisma.momentComment.count({ where: { userId, createdAt: { gte: weekStart } } }),
      prisma.userStoryProgress.count({ where: { userId, startedAt: { gte: weekStart } } }),
    ]);

    const progressMap: Record<string, number> = {
      weekly_chat_15:   weeklyChats,
      weekly_comment_5: weeklyComments,
      weekly_story_3:   weeklyStories,
    };

    const weeklyResult: WeeklyMissionDef[] = WEEKLY_MISSION_DEFS.map(m => ({
      ...m,
      progress: Math.min(progressMap[m.id] ?? 0, m.target),
      completed: completedWeeklyIds.has(m.id),
    }));
    const weeklyCompletedCount = weeklyResult.filter(m => m.completed).length;
    const weeklyRemainingCoins = weeklyResult.reduce((sum, m) => sum + (m.completed ? 0 : m.coins), 0);

    return NextResponse.json({
      missions: dailyResult,
      date: todayStr,
      completedCount: completedDailyIds.size,
      remainingCoins: dailyRemainingCoins,
      weekly: {
        missions: weeklyResult,
        week: weekKey,
        completedCount: weeklyCompletedCount,
        remainingCoins: weeklyRemainingCoins,
      },
    });
  } catch (error) {
    logger.error('[missions] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
