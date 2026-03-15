import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.gachaBanner.update({
    where: { id },
    data: {
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.endAt ? { endAt: new Date(body.endAt) } : {}),
    },
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_BANNER_UPDATE, ctx.email, {
    bannerId: id,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await prisma.gachaBanner.delete({ where: { id } });

  await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_BANNER_DELETE, ctx.email, {
    bannerId: id,
  });

  return NextResponse.json({ ok: true });
}
