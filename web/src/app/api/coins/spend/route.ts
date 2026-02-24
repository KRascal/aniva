import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CoinTxType, Prisma } from '@prisma/client';

interface SpendRequest {
  amount: number;
  type: CoinTxType;
  characterId?: string;
  description?: string;
  idempotencyKey: string;
  metadata?: Prisma.InputJsonObject;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: SpendRequest = await req.json();
    const { amount, type, characterId, description, idempotencyKey, metadata } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 });
    }

    // 冪等性チェック: 既存の処理済みトランザクションがあればスキップ
    const existing = await prisma.coinTransaction.findFirst({
      where: { userId, refId: idempotencyKey },
    });
    if (existing) {
      const currentBalance = await prisma.coinBalance.findUnique({ where: { userId } });
      return NextResponse.json({
        success: true,
        balance: currentBalance?.balance ?? 0,
        transactionId: existing.id,
        skipped: true,
      });
    }

    // トランザクション内で残高チェック → 消費 → 履歴記録
    const result = await prisma.$transaction(async (tx) => {
      const coinBalance = await tx.coinBalance.upsert({
        where: { userId },
        create: { userId, balance: 0 },
        update: {},
      });

      if (coinBalance.balance < amount) {
        throw new Error('INSUFFICIENT_COINS');
      }

      const newBalance = coinBalance.balance - amount;

      await tx.coinBalance.update({
        where: { userId },
        data: { balance: newBalance },
      });

      const transaction = await tx.coinTransaction.create({
        data: {
          userId,
          type,
          amount: -amount,
          balanceAfter: newBalance,
          characterId: characterId ?? null,
          refId: idempotencyKey,
          description: description ?? null,
          metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        },
      });

      return { newBalance, transactionId: transaction.id };
    });

    return NextResponse.json({
      success: true,
      balance: result.newBalance,
      transactionId: result.transactionId,
    });
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_COINS') {
      return NextResponse.json({ error: 'INSUFFICIENT_COINS', message: 'コインが不足しています' }, { status: 402 });
    }
    console.error('Coin spend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
