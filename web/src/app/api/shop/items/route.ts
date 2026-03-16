/**
 * GET /api/shop/items
 * ショップ商品一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const characterIdOrSlug = searchParams.get('characterId');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    // セッション取得（認証は任意）
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // characterId/slug を解決
    let characterId: string | null = null;
    if (characterIdOrSlug) {
      characterId = await resolveCharacterId(characterIdOrSlug);
      if (!characterId) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
      }
    }

    const where = {
      isActive: true,
      ...(characterId ? { characterId } : {}),
      ...(type ? { type } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.shopItem.findMany({
        where,
        include: {
          character: {
            select: { id: true, name: true, slug: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.shopItem.count({ where }),
    ]);

    // 認証済みユーザーの場合、各商品の購入済みフラグを付与
    if (userId && items.length > 0) {
      const itemIds = items.map((item) => item.id);
      const purchasedOrders = await prisma.shopOrder.findMany({
        where: {
          userId,
          itemId: { in: itemIds },
          status: { not: 'cancelled' },
        },
        select: { itemId: true },
      });
      const purchasedSet = new Set(purchasedOrders.map((o) => o.itemId));

      const itemsWithFlag = items.map((item) => ({
        ...item,
        isPurchased: purchasedSet.has(item.id),
      }));

      return NextResponse.json({ items: itemsWithFlag, total });
    }

    const itemsWithFlag = items.map((item) => ({ ...item, isPurchased: false }));
    return NextResponse.json({ items: itemsWithFlag, total });
  } catch (error) {
    logger.error('GET /api/shop/items failed', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
