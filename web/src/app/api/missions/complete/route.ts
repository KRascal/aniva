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

// ミッションIDからコイン数を引くマップ（route.tsと同期）
const MISSION_COINS: Record<string, number> = {
  chat_today:     5,
  moment_comment: 8,
  story_read:     10,
  explore_visit:  5,
  letter_check:   5,
  gacha_pull:     3,
  follow_char:    5,
};

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
    const body = await req.json() as { missionId?: string };
    const { missionId } = body;

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

    const coins = MISSION_COINS[missionId];

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
