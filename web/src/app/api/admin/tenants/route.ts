/**
 * GET  /api/admin/tenants  — テナント一覧
 * POST /api/admin/tenants  — テナント作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          adminUsers: true,
          characters: true,
          contracts: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, slug, logoUrl } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug' }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        logoUrl: logoUrl ?? null,
      },
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    logger.error('[admin/tenants POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
