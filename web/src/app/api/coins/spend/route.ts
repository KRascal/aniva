import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { CoinTxType, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { paymentLimiter, rateLimitResponse } from '@/lib/rate-limit';

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
    const userId = await getVerifiedUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 5回/分（課金API保護）
    const rl = await paymentLimiter.check(userId);
    if (!rl.success) return rateLimitResponse(rl);

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
      const freeBalance = currentBalance?.freeBalance ?? 0;
      const paidBalance = currentBalance?.paidBalance ?? 0;
      return NextResponse.json({
        success: true,
        balance: freeBalance + paidBalance,
        transactionId: existing.id,
        skipped: true,
      });
    }

    // トランザクション内で残高チェック → 消費 → 履歴記録
    const result = await prisma.$transaction(async (tx) => {
      const coinBalance = await tx.coinBalance.upsert({
        where: { userId },
        create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
        update: {},
      });

      const currentFree = coinBalance.freeBalance ?? 0;
      const currentPaid = coinBalance.paidBalance ?? 0;
      const totalBalance = currentFree + currentPaid;

      if (totalBalance < amount) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // freeBalance優先消費
      const freeSpent = Math.min(currentFree, amount);
      const paidSpent = amount - freeSpent;

      const newFreeBalance = currentFree - freeSpent;
      const newPaidBalance = currentPaid - paidSpent;
      const newBalance = newFreeBalance + newPaidBalance;

      await tx.coinBalance.update({
        where: { userId },
        data: {
          freeBalance: newFreeBalance,
          paidBalance: newPaidBalance,
          balance: newBalance,
        },
      });

      // metadataにfreeSpent/paidSpentをマージ
      const mergedMetadata: Prisma.InputJsonObject = {
        ...(metadata ?? {}),
        freeSpent,
        paidSpent,
      };

      const transaction = await tx.coinTransaction.create({
        data: {
          userId,
          type,
          amount: -amount,
          balanceAfter: newBalance,
          characterId: characterId ?? null,
          refId: idempotencyKey,
          description: description ?? null,
          metadata: mergedMetadata as Prisma.InputJsonValue,
        },
      });

      return { newBalance, transactionId: transaction.id };
    });

    return NextResponse.json({
      success: true,
      balance: result.newBalance,
      transactionId: result.transactionId,
    });
  } catch (error: unknown) {
    if (error?.message === 'INSUFFICIENT_COINS') {
      return NextResponse.json({ error: 'INSUFFICIENT_COINS', message: 'コインが不足しています' }, { status: 402 });
    }
    logger.error('Coin spend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
