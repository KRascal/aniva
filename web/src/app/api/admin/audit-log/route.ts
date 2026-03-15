import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const action = searchParams.get('action') ?? undefined;
    const targetType = searchParams.get('targetType') ?? undefined;
    const adminUserId = searchParams.get('adminUserId') ?? undefined;

    const where = {
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(adminUserId ? { adminUserId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          adminUser: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    // Gather distinct action types and target types for filters
    const [actionTypes, targetTypes, adminUsers] = await Promise.all([
      prisma.adminAuditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      prisma.adminAuditLog.findMany({
        select: { targetType: true },
        distinct: ['targetType'],
        orderBy: { targetType: 'asc' },
      }),
      prisma.adminAuditLog.findMany({
        select: { adminUserId: true, adminUser: { select: { email: true, name: true } } },
        distinct: ['adminUserId'],
      }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        actions: actionTypes.map((a) => a.action),
        targetTypes: targetTypes.map((t) => t.targetType),
        adminUsers: adminUsers.map((u) => ({
          id: u.adminUserId,
          email: u.adminUser.email,
          name: u.adminUser.name,
        })),
      },
    });
  } catch (error) {
    logger.error('[admin/audit-log] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
