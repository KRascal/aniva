/**
 * GET /api/shop/purchases
 * ユーザーの購入履歴
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // 認証必須
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const [purchases, total] = await Promise.all([
      prisma.shopOrder.findMany({
        where: {
          userId,
          status: { not: 'cancelled' },
        },
        include: {
          item: {
            include: {
              character: {
                select: { id: true, name: true, slug: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.shopOrder.count({
        where: {
          userId,
          status: { not: 'cancelled' },
        },
      }),
    ]);

    return NextResponse.json({ purchases, total });
  } catch (error) {
    logger.error('GET /api/shop/purchases failed', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
