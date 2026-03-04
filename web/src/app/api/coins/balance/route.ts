import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const coinBalance = await prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
      update: {},
    });

    const freeBalance = coinBalance.freeBalance ?? 0;
    const paidBalance = coinBalance.paidBalance ?? 0;
    // 後方互換: freeBalance/paidBalanceが未移行の場合はlegacy balanceフィールドを使用
    const legacyBalance = coinBalance.balance ?? 0;
    const total = (freeBalance + paidBalance > 0 || legacyBalance === 0)
      ? freeBalance + paidBalance
      : legacyBalance;

    return NextResponse.json({
      balance: total,
      freeBalance: freeBalance > 0 ? freeBalance : legacyBalance,
      paidBalance,
      updatedAt: coinBalance.updatedAt,
    });
  } catch (error) {
    console.error('[coins/balance] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
