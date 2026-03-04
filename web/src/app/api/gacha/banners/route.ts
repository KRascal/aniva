/**
 * GET /api/gacha/banners
 * アクティブなバナー一覧 + 所持カード数
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFreeGachaAvailable } from '@/lib/gacha-system';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();

    const banners = await prisma.gachaBanner.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      select: {
        id: true,
        name: true,
        description: true,
        characterId: true,
        rateUp: true,
        costCoins: true,
        cost10Coins: true,
        guaranteedSrAt: true,
        startAt: true,
        endAt: true,
        isActive: true,
        franchise: true,
        bannerImageUrl: true,
        themeColor: true,
        animationType: true,
        preRollConfig: true,
      },
      orderBy: { startAt: 'desc' },
    });

    const myCardCount = await prisma.userCard.count({ where: { userId } });
    const freeGachaAvailable = await getFreeGachaAvailable(userId);

    return NextResponse.json({ banners, myCardCount, freeGachaAvailable });
  } catch (err) {
    // DB migration not yet applied (production pending)
    const message = err instanceof Error ? err.message : 'Service unavailable';
    console.error('[gacha/banners] DB error:', message);
    return NextResponse.json(
      { error: 'ガチャ機能は準備中です', banners: [], myCardCount: 0, freeGachaAvailable: false },
      { status: 503 },
    );
  }
}
