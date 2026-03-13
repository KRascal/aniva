/**
 * POST /api/gacha/pull
 * ガチャを引く
 */

import { NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { gachaLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { pullGacha, getFreeGachaAvailable } from '@/lib/gacha-system';

// デフォルトコスト（banner.costCoins/cost10Coinsで上書き可能）
const DEFAULT_COSTS: Record<number, number> = {
  1: 100,
  10: 900,
};

export async function POST(req: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await gachaLimiter.check(userId)
  if (!rl.success) return rateLimitResponse(rl)

  const body = await req.json();
  const { bannerId, count, free } = body as { bannerId: string; count: 1 | 10; free?: boolean };

  if (!bannerId || !count) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Guard: check if gacha tables exist (migration may be pending in production)
  try {
    await prisma.gachaBanner.count();
  } catch {
    return NextResponse.json({ error: 'ガチャ機能は準備中です' }, { status: 503 });
  }

  // ── 無料ガチャ ──
  if (free) {
    const available = await getFreeGachaAvailable(userId);
    if (!available) {
      return NextResponse.json({ error: '本日の無料ガチャは既に使用済みです' }, { status: 400 });
    }

    try {
      const results = await pullGacha(userId, bannerId, 1, 'login_bonus');
      const coinBalance = await prisma.coinBalance.upsert({
        where: { userId },
        create: { userId, balance: 0 },
        update: {},
      });
      // 天井進捗を取得
      const pityRecord = await prisma.userGachaPity.findUnique({
        where: { userId_bannerId: { userId, bannerId } },
      });
      const bannerData = await prisma.gachaBanner.findUnique({ where: { id: bannerId } });
      const pityProgress = {
        current: pityRecord?.pullCount ?? 0,
        ceiling: bannerData?.ceilingCount ?? 100,
        guaranteedRarity: 'UR',
      };
      return NextResponse.json({ results, coinBalance: coinBalance.balance, free: true, pityProgress });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gacha failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── 通常ガチャ（コイン消費: バナー設定優先） ──
  if (!DEFAULT_COSTS[count]) {
    return NextResponse.json({ error: 'Invalid count' }, { status: 400 });
  }

  const banner = await prisma.gachaBanner.findUnique({ where: { id: bannerId }, select: { costCoins: true, cost10Coins: true } });
  const cost = count === 10
    ? (banner?.cost10Coins ?? banner?.costCoins ? banner.costCoins * 10 : DEFAULT_COSTS[10])
    : (banner?.costCoins ?? DEFAULT_COSTS[1]);

  const coinBalance = await prisma.coinBalance.upsert({
    where: { userId },
    create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
    update: {},
  });

  const totalBalance = coinBalance.freeBalance + coinBalance.paidBalance;
  if (totalBalance < cost) {
    return NextResponse.json(
      { error: 'コインが足りません', required: cost, current: totalBalance },
      { status: 400 },
    );
  }

  // コインを引く（freeBalance優先消費）
  const freeSpent = Math.min(coinBalance.freeBalance, cost);
  const paidSpent = cost - freeSpent;
  const updatedBalance = await prisma.coinBalance.update({
    where: { userId },
    data: {
      freeBalance: { decrement: freeSpent },
      paidBalance: { decrement: paidSpent },
      balance: { decrement: cost },
    },
  });

  try {
    const results = await pullGacha(userId, bannerId, count);
    // 天井進捗を取得
    const pityRecord = await prisma.userGachaPity.findUnique({
      where: { userId_bannerId: { userId, bannerId } },
    });
    const bannerInfo = await prisma.gachaBanner.findUnique({ where: { id: bannerId } });
    const pityProgress = {
      current: pityRecord?.pullCount ?? 0,
      ceiling: bannerInfo?.ceilingCount ?? 100,
      guaranteedRarity: 'UR',
    };
    return NextResponse.json({ results, coinBalance: updatedBalance.balance, pityProgress });
  } catch (err) {
    // ガチャ失敗時はコインを戻す
    await prisma.coinBalance.update({
      where: { userId },
      data: {
        freeBalance: { increment: freeSpent },
        paidBalance: { increment: paidSpent },
        balance: { increment: cost },
      },
    });
    const message = err instanceof Error ? err.message : 'Gacha failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
