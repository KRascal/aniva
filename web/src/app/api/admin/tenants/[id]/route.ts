import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// PUT /api/admin/tenants/[id] — テナント更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { name, slug, logoUrl, isActive } = await req.json();

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  await adminAudit('tenant_update', ctx.email, { tenantId: id, changes: { name, slug, isActive } });

  return NextResponse.json(tenant);
}

// DELETE /api/admin/tenants/[id] — テナント削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // メンバーやキャラが紐付いている場合は無効化のみ推奨
  const counts = await prisma.tenant.findUnique({
    where: { id },
    include: { _count: { select: { adminUsers: true, characters: true } } },
  });

  if (counts && (counts._count.adminUsers > 0 || counts._count.characters > 0)) {
    return NextResponse.json({
      error: 'テナントにメンバーまたはキャラが紐付いています。先に解除するか、無効化してください。',
    }, { status: 409 });
  }

  await prisma.tenant.delete({ where: { id } });
  await adminAudit('tenant_delete', ctx.email, { tenantId: id });

  return NextResponse.json({ ok: true });
}
