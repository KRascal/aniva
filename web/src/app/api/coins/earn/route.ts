/**
 * POST /api/coins/earn
 * ランダムイベント等でコインをユーザーに付与する（上限: 1日50コインまで）
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

const DAILY_EARN_LIMIT = 50; // 1日の上限

export async function POST(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, reason } = await req.json() as { amount: number; reason?: string };
    if (!amount || amount <= 0 || amount > 50) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 今日付与済みのコイン数を確認（ランダムイベント経由のみカウント）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEarned = await prisma.coinTransaction.aggregate({
      where: {
        userId,
        type: 'BONUS',
        description: { contains: 'random_event' },
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });

    const alreadyEarned = todayEarned._sum.amount ?? 0;
    if (alreadyEarned >= DAILY_EARN_LIMIT) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'daily_limit' });
    }

    const actualAmount = Math.min(amount, DAILY_EARN_LIMIT - alreadyEarned);

    const existingBalance = await prisma.coinBalance.findUnique({ where: { userId } });
    const newBalance = (existingBalance?.balance ?? 0) + actualAmount;

    await prisma.$transaction([
      prisma.coinBalance.upsert({
        where: { userId },
        create: {
          userId,
          balance: actualAmount,
          freeBalance: actualAmount,
          paidBalance: 0,
        },
        update: {
          balance: { increment: actualAmount },
          freeBalance: { increment: actualAmount },
        },
      }),
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: actualAmount,
          type: 'BONUS',
          balanceAfter: newBalance,
          description: `random_event: ${reason ?? 'chat'}`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, earned: actualAmount });
  } catch (error) {
    logger.error('[coins/earn] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
