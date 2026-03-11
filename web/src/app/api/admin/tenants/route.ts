import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/tenants — テナント一覧
export async function GET() {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { adminUsers: true, characters: true, contracts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tenants);
}

// POST /api/admin/tenants — テナント作成
export async function POST(req: NextRequest) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, slug, logoUrl } = await req.json();
  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
  }

  // slug重複チェック
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'slug already exists' }, { status: 409 });
  }

  const tenant = await prisma.tenant.create({
    data: { name, slug, logoUrl: logoUrl || null },
  });

  await adminAudit('tenant_create', ctx.email, { tenantId: tenant.id, name, slug });

  return NextResponse.json(tenant, { status: 201 });
}
