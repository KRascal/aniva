import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { GachaRarity } from '@prisma/client';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    logger.error('[admin/gacha/cards] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

    await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_CARD_CREATE, ctx.email, {
      cardId: card.id, name, characterId, rarity,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    logger.error('[admin/gacha/cards] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const {
      id, name, description, characterId, rarity, category,
      franchise, cardImageUrl, illustrationUrl, frameType, effect,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (!name || !characterId || !rarity) {
      return NextResponse.json({ error: 'name, characterId, rarity are required' }, { status: 400 });
    }

    const card = await prisma.gachaCard.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        characterId,
        rarity: rarity as GachaRarity,
        category: category ?? 'memory',
        franchise: franchise ?? null,
        cardImageUrl: cardImageUrl ?? null,
        illustrationUrl: illustrationUrl ?? null,
        frameType: frameType ?? null,
        effect: effect ?? null,
      },
      include: { character: { select: { name: true } } },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.GACHA_CARD_UPDATE, ctx.email, {
      cardId: id, name, rarity, changes: body,
    });

    return NextResponse.json(card);
  } catch (error) {
    logger.error('[admin/gacha/cards] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
