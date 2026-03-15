/**
 * アカウント削除 API
 * DELETE /api/user/account
 *
 * - 30日の猶予期間付きソフトデリート
 * - deletedAt = now(), deleteScheduledAt = now() + 30日
 * - 全セッション無効化
 * - 削除理由（任意）を保存
 *
 * GDPR / App Store / Google Play ストア審査対応
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let reason: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    reason = typeof body.reason === 'string' ? body.reason.trim() || undefined : undefined;
  } catch {
    // reason は任意なので無視
  }

  try {
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30日

    await prisma.$transaction(async (tx) => {
      // 1. ソフトデリートフラグをセット
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          deleteScheduledAt: scheduledAt,
          deletionReason: reason ?? null,
        },
      });

      // 2. 全セッションを無効化（即座にログアウト状態にする）
      await tx.session.deleteMany({
        where: { userId },
      });
    });

    logger.info(`[account/DELETE] User ${userId} scheduled for deletion at ${scheduledAt.toISOString()}. Reason: ${reason ?? 'none'}`);

    return NextResponse.json({
      success: true,
      message: 'アカウントの削除をスケジュールしました。30日以内にログインすると削除をキャンセルできます。',
      deleteScheduledAt: scheduledAt.toISOString(),
    });
  } catch (error) {
    logger.error('[account/DELETE] Failed to schedule deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
