import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coinBalance = await prisma.coinBalance.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });

  return NextResponse.json({ balance: coinBalance.balance, updatedAt: coinBalance.updatedAt });
}
