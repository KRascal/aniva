import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const VALID_STATUSES = ['reviewed', 'resolved', 'dismissed'];

/**
 * PATCH /api/admin/reports/[id] — 通報ステータス更新
 * 管理者専用
 *
 * body: {
 *   status: "reviewed" | "resolved" | "dismissed"
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // 対象の通報が存在するか確認
    const existing = await prisma.report.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status,
        reviewedBy: ctx.id,
        reviewedAt: new Date(),
      },
    });

    logger.info('Admin: report status updated', {
      adminId: ctx.id,
      reportId: id,
      oldStatus: existing.status,
      newStatus: status,
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    logger.error('PATCH /api/admin/reports/[id] error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
