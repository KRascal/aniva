/**
 * POST /api/gacha/pull
 * ガチャを引く
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pullGacha } from '@/lib/gacha-system';

const COSTS: Record<number, number> = {
  1: 100,
  10: 900,
};

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { bannerId, count } = body as { bannerId: string; count: 1 | 10 };

  if (!bannerId || !count || !COSTS[count]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const cost = COSTS[count];

  const coinBalance = await prisma.coinBalance.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });

  if (coinBalance.balance < cost) {
    return NextResponse.json(
      { error: 'コインが足りません', required: cost, current: coinBalance.balance },
      { status: 400 },
    );
  }

  // コインを引く
  const updatedBalance = await prisma.coinBalance.update({
    where: { userId },
    data: { balance: { decrement: cost } },
  });

  try {
    const results = await pullGacha(userId, bannerId, count);
    return NextResponse.json({ results, coinBalance: updatedBalance.balance });
  } catch (err) {
    // ガチャ失敗時はコインを戻す
    await prisma.coinBalance.update({
      where: { userId },
      data: { balance: { increment: cost } },
    });
    const message = err instanceof Error ? err.message : 'Gacha failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
