/**
 * GET /api/shop/items/[id]
 * ショップ商品詳細
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.shopItem.findUnique({
      where: { id },
      include: {
        character: {
          select: { id: true, name: true, slug: true, avatarUrl: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!item.isActive) {
      return NextResponse.json({ error: 'Item not available' }, { status: 404 });
    }

    // セッション取得（認証は任意）
    const session = await auth();
    const userId = session?.user?.id ?? null;

    let isPurchased = false;
    if (userId) {
      const existingOrder = await prisma.shopOrder.findFirst({
        where: {
          userId,
          itemId: id,
          status: { not: 'cancelled' },
        },
        select: { id: true },
      });
      isPurchased = !!existingOrder;
    }

    return NextResponse.json({ item, isPurchased });
  } catch (error) {
    logger.error('GET /api/shop/items/[id] failed', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
