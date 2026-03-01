import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const banners = await prisma.gachaBanner.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
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

  return NextResponse.json(banner, { status: 201 });
}
