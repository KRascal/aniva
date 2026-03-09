/**
 * ミッション完了 API
 * POST /api/missions/complete
 * body: { missionId: string }
 * - ミッションを完了済みにしてコインを付与
 * - 一部ミッションはサーバーサイドで達成条件を検証
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// デイリーミッションIDからコイン数を引くマップ（route.tsと同期）
const MISSION_COINS: Record<string, number> = {
  chat_today:     5,
  moment_comment: 8,
  story_read:     10,
  explore_visit:  5,
  letter_check:   5,
  gacha_pull:     3,
  follow_char:    5,
};

// ウィークリーチャレンジIDからコイン数・達成条件
const WEEKLY_MISSION_DEF: Record<string, { coins: number; target: number }> = {
  weekly_chat_15:   { coins: 30, target: 15 },
  weekly_comment_5: { coins: 25, target: 5 },
  weekly_story_3:   { coins: 40, target: 3 },
};

/** 今週の月曜0:00 JST をUTCで返す */
function getWeekStartUTC(): Date {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const day = jstNow.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const mondayJST = new Date(jstNow.getTime() - daysToMonday * 86400000);
  mondayJST.setUTCHours(0, 0, 0, 0);
  return new Date(mondayJST.getTime() - 9 * 3600000);
}

function getWeekKey(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600000);
  const jan1 = new Date(jstNow.getUTCFullYear(), 0, 1);
  const weekNum = Math.ceil(((jstNow.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${jstNow.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function verifyMission(missionId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  switch (missionId) {
    case 'chat_today': {
      // 今日メッセージを1通以上送ったか確認
      const msg = await prisma.message.findFirst({
        where: {
          role: 'USER',
          createdAt: { gte: todayStart },
          conversation: {
            relationship: { userId },
          },
        },
      });
      return msg ? { ok: true } : { ok: false, reason: 'キャラとチャットしてから完了してね！' };
    }
    case 'moment_comment': {
      // 今日コメントを投稿したか確認
      const comment = await prisma.momentComment.findFirst({
        where: {
          userId,
          createdAt: { gte: todayStart },
        },
      });
      return comment ? { ok: true } : { ok: false, reason: 'Momentにコメントしてから完了してね！' };
    }
    case 'story_read': {
      // 今日ストーリーを読んだか（UserStoryProgress.startedAt で確認）
      const progress = await prisma.userStoryProgress.findFirst({
        where: {
          userId,
          startedAt: { gte: todayStart },
        },
      });
      return progress ? { ok: true } : { ok: false, reason: 'ストーリーを読んでから完了してね！' };
    }
    case 'gacha_pull': {
      // 今日ガチャを引いたか（UserCard.obtainedAt で確認）
      const card = await prisma.userCard.findFirst({
        where: {
          userId,
          obtainedAt: { gte: todayStart },
        },
      });
      return card ? { ok: true } : { ok: false, reason: 'ガチャを引いてから完了してね！' };
    }
    case 'follow_char': {
      // フォロー操作はいつでもOK（クライアントトリガー）
      return { ok: true };
    }
    // explore_visit / letter_check はクライアントトリガーのみで検証なし
    default:
      return { ok: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // ユーザー存在チェック（セッション残骸対策）
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json() as { missionId?: string };
    const { missionId } = body;

    // ウィークリーミッション処理
    if (missionId && missionId in WEEKLY_MISSION_DEF) {
      const def = WEEKLY_MISSION_DEF[missionId]!;
      const weekStart = getWeekStartUTC();
      const weekKey = getWeekKey();
      const descKey = `weekly_mission_${missionId}_${weekKey}`;

      const existing = await prisma.coinTransaction.findFirst({ where: { userId, type: 'BONUS', description: descKey } });
      if (existing) {
        return NextResponse.json({ alreadyClaimed: true, message: 'このチャレンジは今週完了済みだよ！' });
      }

      // 今週の進捗確認
      let progress = 0;
      if (missionId === 'weekly_chat_15') {
        progress = await prisma.message.count({
          where: { role: 'USER', createdAt: { gte: weekStart }, conversation: { relationship: { userId } } },
        });
      } else if (missionId === 'weekly_comment_5') {
        progress = await prisma.momentComment.count({ where: { userId, createdAt: { gte: weekStart } } });
      } else if (missionId === 'weekly_story_3') {
        progress = await prisma.userStoryProgress.count({ where: { userId, startedAt: { gte: weekStart } } });
      }

      if (progress < def.target) {
        return NextResponse.json({
          ok: false,
          message: `あと${def.target - progress}回で達成！もう少しだよ！`,
        }, { status: 400 });
      }

      const balance = await prisma.coinBalance.upsert({
        where: { userId },
        create: { userId, balance: def.coins },
        update: { balance: { increment: def.coins } },
      });
      await prisma.coinTransaction.create({
        data: { userId, type: 'BONUS', amount: def.coins, balanceAfter: balance.balance, description: descKey },
      });
      return NextResponse.json({ ok: true, coins: def.coins, totalBalance: balance.balance, message: `週チャレンジ達成！+${def.coins}コイン🎊` });
    }

    if (!missionId || !(missionId in MISSION_COINS)) {
      return NextResponse.json({ error: 'Invalid mission' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const descKey = `mission_${missionId}_${todayStr}`;

    // 既に完了済みかチェック
    const existing = await prisma.coinTransaction.findFirst({
      where: {
        userId,
        type: 'BONUS',
        description: descKey,
      },
    });
    if (existing) {
      return NextResponse.json({ alreadyClaimed: true, message: 'このミッションは今日完了済みだよ！' });
    }

    // 達成条件検証
    const verify = await verifyMission(missionId, userId);
    if (!verify.ok) {
      return NextResponse.json({ ok: false, message: verify.reason }, { status: 400 });
    }

    const coins = MISSION_COINS[missionId]!;

    // コイン付与
    const balance = await prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: coins },
      update: { balance: { increment: coins } },
    });

    await prisma.coinTransaction.create({
      data: {
        userId,
        type: 'BONUS',
        amount: coins,
        balanceAfter: balance.balance,
        description: descKey,
      },
    });

    return NextResponse.json({
      ok: true,
      coins,
      totalBalance: balance.balance,
      message: `+${coins}コイン獲得！ミッション達成！ 🎉`,
    });
  } catch (error) {
    console.error('[missions/complete] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
