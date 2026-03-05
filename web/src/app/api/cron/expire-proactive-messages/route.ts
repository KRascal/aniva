/**
 * プロアクティブメッセージ期限切れ処理 Cron
 * POST /api/cron/expire-proactive-messages
 * Header: x-cron-secret
 *
 * 毎時実行: 期限切れメッセージを isExpired=true にセット（論理削除）
 * スケジュール: 0 * * * *
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await prisma.characterProactiveMessage.updateMany({
    where: {
      isExpired: false,
      expiresAt: { lt: new Date() },
    },
    data: { isExpired: true },
  });

  return NextResponse.json({ ok: true, expired: result.count });
}
