/**
 * GET /api/admin/tenants/[id]/characters
 * テナントに属するキャラクター一覧を返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const characters = await prisma.character.findMany({
      where: { tenantId: id },
      select: {
        id: true,
        name: true,
        slug: true,
        franchise: true,
        avatarUrl: true,
        isActive: true,
        fcMonthlyPriceJpy: true,
        fcSubscriberCount: true,
        createdAt: true,
      },
      orderBy: { fcSubscriberCount: 'desc' },
    });

    return NextResponse.json({ characters });
  } catch (err) {
    console.error('[api/admin/tenants/:id/characters]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
