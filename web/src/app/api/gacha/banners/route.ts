/**
 * GET /api/gacha/banners
 * アクティブなバナー一覧 + 所持カード数
 */

import { NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getFreeGachaAvailable } from '@/lib/gacha-system';
import { cacheGet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache';

export async function GET() {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();

    // バナー一覧はキャッシュ（全ユーザー共通データ）
    const banners = await cacheGet(
      CACHE_KEYS.GACHA_BANNERS,
      CACHE_TTL.GACHA_BANNERS,
      async () => {
        return prisma.gachaBanner.findMany({
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
      },
    );

    // ユーザー固有データはキャッシュしない
    const [myCardCount, freeGachaAvailable] = await Promise.all([
      prisma.userCard.count({ where: { userId } }),
      getFreeGachaAvailable(userId),
    ]);

    return NextResponse.json({ banners, myCardCount, freeGachaAvailable });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Service unavailable';
    console.error('[gacha/banners] DB error:', message);
    return NextResponse.json(
      { error: 'ガチャ機能は準備中です', banners: [], myCardCount: 0, freeGachaAvailable: false },
      { status: 503 },
    );
  }
}
