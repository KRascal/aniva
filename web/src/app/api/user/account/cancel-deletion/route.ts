/**
 * アカウント削除キャンセル API
 * POST /api/user/account/cancel-deletion
 *
 * - deletedAt / deleteScheduledAt / deletionReason を null にリセット（復活）
 * - 削除スケジュールが存在しない場合は 400 を返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, deleteScheduledAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.deletedAt) {
      return NextResponse.json(
        { error: '削除スケジュールが設定されていません' },
        { status: 400 }
      );
    }

    // 物理削除予定日を過ぎていないかチェック
    if (user.deleteScheduledAt && user.deleteScheduledAt < new Date()) {
      return NextResponse.json(
        { error: '削除猶予期間が終了しています。復活できません。' },
        { status: 410 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        deleteScheduledAt: null,
        deletionReason: null,
      },
    });

    logger.info(`[account/cancel-deletion] User ${userId} restored (deletion cancelled).`);

    return NextResponse.json({
      success: true,
      message: 'アカウントの削除をキャンセルしました。引き続きご利用いただけます。',
    });
  } catch (error) {
    logger.error('[account/cancel-deletion] Failed to cancel deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
