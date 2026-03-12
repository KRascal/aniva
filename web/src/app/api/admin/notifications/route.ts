import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '50');
    const skip = (page - 1) * limit;

    // 管理者送信の通知のみ（type='admin_broadcast'）
    const where = { type: 'admin_broadcast' };

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ notifications, total });
  } catch (error) {
    logger.error('[GET /api/admin/notifications]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { title, body: notifBody, targetUrl, targetUserId } = body;

    if (!title || !notifBody) {
      return NextResponse.json({ error: 'タイトルと本文は必須です' }, { status: 400 });
    }

    let userIds: string[];

    if (targetUserId) {
      // 特定ユーザーへの送信
      userIds = [targetUserId];
    } else {
      // 全ユーザーへの一斉配信
      const users = await prisma.user.findMany({
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 400 });
    }

    // バッチでNotificationレコード作成
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: 'admin_broadcast',
        title,
        body: notifBody,
        targetUrl: targetUrl || null,
        isRead: false,
      })),
      skipDuplicates: false,
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.NOTIFICATION_SEND, admin.email, {
      title, sentCount: userIds.length, targetUserId: targetUserId || 'all',
    });

    return NextResponse.json({
      ok: true,
      sentCount: userIds.length,
    });
  } catch (error) {
    logger.error('[POST /api/admin/notifications]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
