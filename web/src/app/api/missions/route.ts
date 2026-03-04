/**
 * デイリーミッション API
 * GET /api/missions
 * - 今日のミッション一覧と完了状況を返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  coins: number;
  icon: string;
}

// 7日サイクルで回るミッションセット（3ミッション/日）
const ALL_MISSIONS: MissionDef[] = [
  { id: 'chat_today',     title: '推しとチャット',         desc: 'キャラにメッセージを送る',          coins: 5,  icon: '💬' },
  { id: 'moment_comment', title: 'Momentにコメント',       desc: 'Momentにコメントを投稿する',        coins: 8,  icon: '💜' },
  { id: 'story_read',     title: 'ストーリーを読む',        desc: 'ストーリーを1章進める',             coins: 10, icon: '📖' },
  { id: 'explore_visit',  title: 'キャラを探す',           desc: 'exploreページを訪れる',             coins: 5,  icon: '🔍' },
  { id: 'letter_check',   title: 'レターをチェック',        desc: 'レターボックスを開く',              coins: 5,  icon: '✉️' },
  { id: 'gacha_pull',     title: 'ガチャを引く',            desc: 'ガチャを1回引く',                  coins: 3,  icon: '🎰' },
  { id: 'follow_char',    title: 'キャラをフォロー',        desc: '新しいキャラをフォローする',         coins: 5,  icon: '⭐' },
];

function getTodayMissions(): MissionDef[] {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const offset = dayOfYear % ALL_MISSIONS.length;
  // 3ミッションを今日の分として返す（循環）
  return [0, 1, 2].map(i => ALL_MISSIONS[(offset + i) % ALL_MISSIONS.length]);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const missions = getTodayMissions();

    // 今日完了済みのミッションをcoinTransactionから取得
    const completed = await prisma.coinTransaction.findMany({
      where: {
        userId,
        type: 'BONUS',
        description: { startsWith: `mission_` },
        createdAt: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lt: new Date(`${todayStr}T23:59:59.999Z`),
        },
      },
      select: { description: true },
    });

    const completedIds = new Set(
      completed.map(t => (t.description ?? '').replace(/^mission_/, '').replace(/_\d{4}-\d{2}-\d{2}$/, ''))
    );

    const result = missions.map(m => ({
      ...m,
      completed: completedIds.has(m.id),
    }));

    const totalCoins = result.reduce((sum, m) => sum + (m.completed ? 0 : m.coins), 0);

    return NextResponse.json({
      missions: result,
      date: todayStr,
      completedCount: completedIds.size,
      remainingCoins: totalCoins,
    });
  } catch (error) {
    console.error('[missions] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
