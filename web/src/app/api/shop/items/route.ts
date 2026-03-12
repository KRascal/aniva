import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET: 商品一覧取得（アクティブな商品のみ）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get('characterId');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = { isActive: true };
    if (characterId) where.characterId = characterId;
    if (type) where.type = type;

    const items = await prisma.shopItem.findMany({
      where,
      include: {
        character: {
          select: { id: true, name: true, avatarUrl: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error('[GET /api/shop/items]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: 商品追加（管理者のみ）
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { characterId, name, description, type, priceCoins, priceJpy, imageUrl, fileUrl, stock } = body;

    if (!characterId || !name || !type || priceCoins === undefined) {
      return NextResponse.json({ error: 'Missing required fields: characterId, name, type, priceCoins' }, { status: 400 });
    }

    const item = await prisma.shopItem.create({
      data: {
        characterId,
        name,
        description: description ?? null,
        type,
        priceCoins: Number(priceCoins),
        priceJpy: priceJpy ? Number(priceJpy) : null,
        imageUrl: imageUrl ?? null,
        fileUrl: fileUrl ?? null,
        stock: stock !== undefined && stock !== null ? Number(stock) : null,
        isActive: true,
      },
      include: {
        character: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/shop/items]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
