/**
 * プロアクティブメッセージ期限切れ処理 Cron
 * POST /api/cron/expire-proactive-messages
 * Header: x-cron-secret
 *
 * 毎時実行: 期限切れメッセージを isExpired=true にセット（論理削除）
 * スケジュール: 0 * * * *
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const result = await prisma.characterProactiveMessage.updateMany({
    where: {
      isExpired: false,
      expiresAt: { lt: new Date() },
    },
    data: { isExpired: true },
  });

  return NextResponse.json({ ok: true, expired: result.count });
}
