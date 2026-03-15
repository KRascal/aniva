/**
 * PUT    /api/admin/tenants/[id]  — テナント更新
 * DELETE /api/admin/tenants/[id]  — テナント削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, slug, logoUrl, isActive } = body;

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ tenant: updated });
  } catch (err) {
    logger.error('[admin/tenants PUT]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('[admin/tenants DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
