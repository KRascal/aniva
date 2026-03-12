import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';
import { cacheInvalidate, CACHE_KEYS } from '@/lib/redis-cache';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_BANNER_UPDATE, admin.email, {
    bannerId: id,
  });

  await cacheInvalidate(CACHE_KEYS.GACHA_BANNERS);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await prisma.gachaBanner.delete({ where: { id } });

  await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_BANNER_DELETE, admin.email, {
    bannerId: id,
  });

  await cacheInvalidate(CACHE_KEYS.GACHA_BANNERS);

  return NextResponse.json({ ok: true });
}
