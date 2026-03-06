import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 未完了ミッション煽り通知 cron
 * 21:00 JSTに実行。残り1-2個のユーザーに「あと少し！」とDM送信
 * ツァイガルニク効果: 未完了タスクは記憶に残る → 完了させたくなる
 */

// デイリーミッション定義（missions APIと同期）
const DAILY_MISSIONS = [
  { id: 'chat_3', label: 'キャラと3回会話', target: 3, type: 'chat' },
  { id: 'comment_1', label: 'Momentにコメント', target: 1, type: 'comment' },
  { id: 'gacha_1', label: 'ガチャを1回引く', target: 1, type: 'gacha' },
];

const REMINDER_MESSAGES = [
  'あと{remaining}個でデイリーミッション達成！🎯 今日のコイン、逃さないで！',
  'ミッション残り{remaining}個…！💰 報酬が待ってるよ！',
  'デイリーミッションあと少し！残り{remaining}個で本日のボーナス獲得 ✨',
  '今日のミッション、まだ{remaining}個残ってるよ！完了でコインGET 🪙',
  'あとちょっと！残り{remaining}個のミッションを達成してコインをもらおう 🔥',
];

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
      // 今日の各ミッション進捗を確認
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

      const progress = [
        { ...DAILY_MISSIONS[0], current: chatCount },
        { ...DAILY_MISSIONS[1], current: commentCount },
        { ...DAILY_MISSIONS[2], current: gachaCount },
      ];

      const completed = progress.filter(m => m.current >= m.target).length;
      const remaining = DAILY_MISSIONS.length - completed;

      // 残り1-2個の場合のみリマインド（全完了 or 全未完了はスキップ）
      if (remaining >= 1 && remaining <= 2) {
        const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]
          .replace('{remaining}', String(remaining));

        // プロアクティブメッセージとして保存（キャラからの通知として表示される）
        // 最もアクティブなキャラを選択
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
    console.error('[mission-reminder cron] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
