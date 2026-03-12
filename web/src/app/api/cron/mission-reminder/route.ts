import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * 未完了ミッション煽り通知 cron
 * 21:00 JSTに実行。残り1-2個のユーザーに「あと少し！」とDM送信
 * ツァイガルニク効果: 未完了タスクは記憶に残る → 完了させたくなる
 *
 * 進捗率 80%以上（残り1個）→ 緊急メッセージ ("今日中にあと1つ！")
 * 進捗率 80%未満（残り2個）→ 通常リマインド
 */

// デイリーミッション定義（missions APIと同期）
const DAILY_MISSIONS = [
  { id: 'chat_3', label: 'キャラと3回会話', target: 3, type: 'chat' },
  { id: 'comment_1', label: 'Momentにコメント', target: 1, type: 'comment' },
  { id: 'gacha_1', label: 'ガチャを1回引く', target: 1, type: 'gacha' },
];

// 通常リマインド（残り2個）
const REMINDER_MESSAGES = [
  'あと{remaining}個でデイリーミッション達成！🎯 今日のコイン、逃さないで！',
  'ミッション残り{remaining}個…！💰 報酬が待ってるよ！',
  'デイリーミッションあと少し！残り{remaining}個で本日のボーナス獲得 ✨',
  '今日のミッション、まだ{remaining}個残ってるよ！完了でコインGET 🪙',
  'あとちょっと！残り{remaining}個のミッションを達成してコインをもらおう 🔥',
];

// 緊急リマインド（進捗率 80%以上 = 残り1個）
const URGENT_MESSAGES = [
  '⚡ あと1個で全クリア！今日中にあと1つだけ！コインが待ってるよ 🪙',
  '🔥 もう少し！残り1個のミッション達成で本日のボーナス完全獲得！',
  '今日中にあと1つ！全クリアでボーナスコインをGETしよう 🎯✨',
  '⚡ ラスト1個！今すぐクリアして今日を完璧な1日にしよう！',
  '🏆 あと1個だけ！全ミッションクリアで特別ボーナスを逃さないで！',
];

/**
 * 今週月曜 00:00 JST をUTCで返す
 */
function getWeekStartUTC(): Date {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const day = jstNow.getUTCDay(); // 0=Sun
  const daysToMonday = day === 0 ? 6 : day - 1;
  const mondayJST = new Date(jstNow.getTime() - daysToMonday * 86400000);
  mondayJST.setUTCHours(0, 0, 0, 0);
  return new Date(mondayJST.getTime() - 9 * 3600000);
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = getWeekStartUTC();

    // 今日アクティブだったユーザーを取得（最近24h以内にログイン）
    const activeUsers = await prisma.user.findMany({
      where: {
        sessions: { some: { expires: { gte: today } } },
      },
      select: { id: true },
      take: 500,
    });

    let reminded = 0;

    for (const user of activeUsers) {
      // ── デイリーミッション進捗 ──
      const chatCount = await prisma.message.count({
        where: {
          conversation: { relationship: { userId: user.id } },
          role: 'USER',
          createdAt: { gte: today },
        },
      });
      const commentCount = await prisma.momentComment.count({
        where: { userId: user.id, createdAt: { gte: today } },
      });
      // ガチャはUserCardから推定
      const gachaCount = await prisma.userCard.count({
        where: { userId: user.id, obtainedAt: { gte: today } },
      });

      const dailyProgress = [
        { ...DAILY_MISSIONS[0], current: chatCount },
        { ...DAILY_MISSIONS[1], current: commentCount },
        { ...DAILY_MISSIONS[2], current: gachaCount },
      ];

      const dailyCompleted = dailyProgress.filter(m => m.current >= m.target).length;
      const dailyTotal = DAILY_MISSIONS.length;
      const dailyRemaining = dailyTotal - dailyCompleted;

      // ── ウィークリーミッション進捗（追加集計） ──
      const weeklyChatCount = await prisma.message.count({
        where: {
          conversation: { relationship: { userId: user.id } },
          role: 'USER',
          createdAt: { gte: weekStart },
        },
      });
      const weeklyCommentCount = await prisma.momentComment.count({
        where: { userId: user.id, createdAt: { gte: weekStart } },
      });

      const weeklyMissions = [
        { target: 15, current: weeklyChatCount },
        { target: 5, current: weeklyCommentCount },
        // weekly_story_3: DB追跡なしのため保守的に0扱い
      ];
      const weeklyCompleted = weeklyMissions.filter(m => m.current >= m.target).length;
      const weeklyTotal = 3; // weekly_chat_15 + weekly_comment_5 + weekly_story_3

      // ── 総合進捗率 ──
      const totalCompleted = dailyCompleted + weeklyCompleted;
      const totalMissions = dailyTotal + weeklyTotal;
      const progressRate = totalCompleted / totalMissions; // 0.0〜1.0

      // リマインド条件: デイリーが残り1-2個（全完了 or 全未完了はスキップ）
      if (dailyRemaining >= 1 && dailyRemaining <= 2) {
        // 進捗率 80%以上、または残り1個 → 緊急メッセージ
        const isUrgent = progressRate >= 0.8 || dailyRemaining === 1;
        const pool = isUrgent ? URGENT_MESSAGES : REMINDER_MESSAGES;
        const msg = pool[Math.floor(Math.random() * pool.length)]
          .replace('{remaining}', String(dailyRemaining));

        // 最もアクティブなキャラを選択してプロアクティブメッセージ送信
        const topRelationship = await prisma.relationship.findFirst({
          where: { userId: user.id, totalMessages: { gt: 0 } },
          orderBy: { totalMessages: 'desc' },
          select: { characterId: true },
        });

        if (topRelationship) {
          await prisma.characterProactiveMessage.create({
            data: {
              characterId: topRelationship.characterId,
              userId: user.id,
              content: msg,
              trigger: 'mission_reminder',
              expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3時間有効
            },
          });
          reminded++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      activeUsers: activeUsers.length,
      reminded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[mission-reminder cron] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
