/**
 * POST /api/admin/users/:userId/grant
 * 管理画面からコイン付与 or FC加入を付与
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { CoinTxType } from '@prisma/client';

// 管理者チェック（簡易版: admin roleのユーザーのみ）
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const adminId = await getVerifiedUserId();
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdmin(adminId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await params;
  const body = await req.json() as { type: 'coins' | 'fc'; amount?: number; characterId?: string };

  try {
    if (body.type === 'coins') {
      const amount = body.amount ?? 1000;
      const result = await prisma.$transaction(async (tx) => {
        const bal = await tx.coinBalance.upsert({
          where: { userId },
          create: { userId, balance: amount, freeBalance: amount, paidBalance: 0 },
          update: { balance: { increment: amount }, freeBalance: { increment: amount } },
        });
        await tx.coinTransaction.create({
          data: {
            userId,
            type: CoinTxType.BONUS,
            amount,
            balanceAfter: bal.balance,
            description: `管理者付与 (by admin)`,
            metadata: { adminId, grantedAt: new Date().toISOString() },
          },
        });
        return bal.balance;
      });
      return NextResponse.json({ success: true, newBalance: result });
    }

    if (body.type === 'fc') {
      if (!body.characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 });

      // 既存チェック
      const existing = await prisma.characterSubscription.findFirst({
        where: { userId, characterId: body.characterId, status: 'ACTIVE' },
      });
      if (existing) return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });

      await prisma.characterSubscription.create({
        data: {
          userId,
          characterId: body.characterId,
          status: 'ACTIVE',
          tier: 'FC',
          priceJpy: 0,
          startedAt: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Admin grant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
