/**
 * POST /api/admin/users/[id]/coins
 * 管理者がユーザーにコインを付与/減算する
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { amount, type = 'free', note } = await req.json() as {
      amount: number;
      type?: 'free' | 'paid';
      note?: string;
    };

    if (!amount || typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ error: 'amount must be a non-zero number' }, { status: 400 });
    }

    const { id: userId } = await params;

    // CoinBalanceをupsert
    const cb = await prisma.coinBalance.upsert({
      where: { userId },
      create: {
        userId,
        balance: Math.max(0, amount),
        freeBalance: type === 'free' ? Math.max(0, amount) : 0,
        paidBalance: type === 'paid' ? Math.max(0, amount) : 0,
      },
      update: {
        balance: { increment: amount },
        freeBalance: type === 'free' ? { increment: amount } : undefined,
        paidBalance: type === 'paid' ? { increment: amount } : undefined,
      },
    });

    // balance が負にならないよう補正
    if (cb.balance < 0 || cb.freeBalance < 0 || cb.paidBalance < 0) {
      await prisma.coinBalance.update({
        where: { userId },
        data: {
          balance: Math.max(0, cb.balance),
          freeBalance: Math.max(0, cb.freeBalance),
          paidBalance: Math.max(0, cb.paidBalance),
        },
      });
    }

    // トランザクション履歴に記録
    const currentBalance = await prisma.coinBalance.findUnique({ where: { userId } });
    await prisma.coinTransaction.create({
      data: {
        userId,
        amount,
        type: 'ADMIN_ADJUST',
        balanceAfter: currentBalance?.balance ?? 0,
        description: note ?? (amount > 0 ? `管理者付与: +${amount}` : `管理者減算: ${amount}`),
      },
    });

    const updated = await prisma.coinBalance.findUnique({ where: { userId } });

    return NextResponse.json({
      success: true,
      balance: updated?.balance ?? 0,
      freeBalance: updated?.freeBalance ?? 0,
      paidBalance: updated?.paidBalance ?? 0,
    });
  } catch (error) {
    console.error('Admin coins grant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
