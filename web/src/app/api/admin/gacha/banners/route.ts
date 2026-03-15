import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const banners = await prisma.gachaBanner.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(banners);
  } catch (error) {
    logger.error('[admin/gacha/banners] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, characterId, startAt, endAt, costCoins, description } = body;

    if (!name || !startAt || !endAt) {
      return NextResponse.json({ error: 'name, startAt, endAt are required' }, { status: 400 });
    }

    const banner = await prisma.gachaBanner.create({
      data: {
        name,
        description: description ?? null,
        characterId: characterId || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        costCoins: Number(costCoins) || 100,
        isActive: true,
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_BANNER_CREATE, ctx.email, {
      bannerId: banner.id, name,
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    logger.error('[admin/gacha/banners] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
