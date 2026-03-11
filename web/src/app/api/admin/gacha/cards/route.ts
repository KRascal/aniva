import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { GachaRarity } from '@prisma/client';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const rarity = searchParams.get('rarity') as GachaRarity | null;
    const characterId = searchParams.get('characterId');

    const cards = await prisma.gachaCard.findMany({
      where: {
        ...(rarity ? { rarity } : {}),
        ...(characterId ? { characterId } : {}),
      },
      include: { character: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('[admin/gacha/cards] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, description, characterId, rarity, category } = body;

    if (!name || !characterId || !rarity) {
      return NextResponse.json({ error: 'name, characterId, rarity are required' }, { status: 400 });
    }

    const card = await prisma.gachaCard.create({
      data: {
        name,
        description: description ?? null,
        characterId,
        rarity: rarity as GachaRarity,
        category: category ?? 'memory',
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_CARD_CREATE, admin.email, {
      cardId: card.id, name, characterId, rarity,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('[admin/gacha/cards] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
