import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_TARGET_TYPES = ['moment', 'comment', 'user', 'message'];
const VALID_REASONS = ['spam', 'harassment', 'inappropriate', 'copyright', 'other'];

/**
 * POST /api/report — 通報作成
 * 認証必須、1ユーザー1対象1日1回制限
 *
 * body: {
 *   targetType: "moment" | "comment" | "user" | "message"
 *   targetId: string
 *   reason: "spam" | "harassment" | "inappropriate" | "copyright" | "other"
 *   detail?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { targetType, targetId, reason, detail } = body;

    // バリデーション
    if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
      return NextResponse.json(
        { error: `targetType must be one of: ${VALID_TARGET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!targetId || typeof targetId !== 'string') {
      return NextResponse.json({ error: 'targetId is required' }, { status: 400 });
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // 自分自身への通報禁止（targetType === 'user' の場合）
    if (targetType === 'user' && targetId === userId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // 1ユーザー1対象1日1回制限
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        targetType,
        targetId,
        createdAt: { gte: todayStart },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content today' },
        { status: 429 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType,
        targetId,
        reason,
        detail: detail ?? null,
        status: 'pending',
      },
    });

    logger.info('Report created', { reportId: report.id, userId, targetType, targetId, reason });

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/report error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
