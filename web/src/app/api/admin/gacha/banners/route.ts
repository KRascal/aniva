import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';
import { cacheInvalidate, CACHE_KEYS } from '@/lib/redis-cache';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const banners = await prisma.gachaBanner.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(banners);
  } catch (error) {
    console.error('[admin/gacha/banners] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

    await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_BANNER_CREATE, admin.email, {
      bannerId: banner.id, name,
    });

    // ガチャバナーキャッシュを破棄
    await cacheInvalidate(CACHE_KEYS.GACHA_BANNERS);

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('[admin/gacha/banners] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
