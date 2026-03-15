import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];

/**
 * GET /api/admin/reports — 通報一覧
 * 管理者専用。statusフィルター・ページネーション対応
 *
 * query:
 *   status?: "pending" | "reviewed" | "resolved" | "dismissed"
 *   targetType?: "moment" | "comment" | "user" | "message"
 *   page?: number (1-indexed, default 1)
 *   limit?: number (max 100, default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const targetType = searchParams.get('targetType');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (targetType) {
      where.targetType = targetType;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              displayName: true,
              nickname: true,
              email: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    logger.info('Admin: reports fetched', { adminId: ctx.userId, total, status, targetType });

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/reports error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
