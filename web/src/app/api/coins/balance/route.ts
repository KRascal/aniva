import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const coinBalance = await prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
      update: {},
    });

    const freeBalance = coinBalance.freeBalance ?? 0;
    const paidBalance = coinBalance.paidBalance ?? 0;

    return NextResponse.json({
      balance: freeBalance + paidBalance,
      freeBalance,
      paidBalance,
      updatedAt: coinBalance.updatedAt,
    });
  } catch (error) {
    console.error('[coins/balance] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
