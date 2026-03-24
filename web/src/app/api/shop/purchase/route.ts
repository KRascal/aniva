/**
 * POST /api/shop/purchase
 * コイン消費購入
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // 認証必須
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { itemId } = body as { itemId?: string };

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 商品取得 & 在庫確認
      const item = await tx.shopItem.findUnique({
        where: { id: itemId },
      });

      if (!item || !item.isActive) {
        throw new Error('ITEM_NOT_FOUND');
      }

      if (item.stock !== null && item.stock <= 0) {
        throw new Error('OUT_OF_STOCK');
      }

      // 2. 重複購入チェック
      const existingOrder = await tx.shopOrder.findFirst({
        where: {
          userId,
          itemId,
          status: { not: 'cancelled' },
        },
      });

      if (existingOrder) {
        throw new Error('ALREADY_PURCHASED');
      }

      // 3. CoinBalance確認 + 消費（freeBalance優先）
      const coinBalance = await tx.coinBalance.findUnique({
        where: { userId },
      });

      const currentFree = coinBalance?.freeBalance ?? 0;
      const currentPaid = coinBalance?.paidBalance ?? 0;
      const totalBalance = currentFree + currentPaid;
      const cost = item.priceCoins;

      if (totalBalance < cost) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // freeBalance優先で消費
      let newFreeBalance = currentFree;
      let newPaidBalance = currentPaid;

      if (currentFree >= cost) {
        newFreeBalance = currentFree - cost;
      } else {
        const remaining = cost - currentFree;
        newFreeBalance = 0;
        newPaidBalance = currentPaid - remaining;
      }

      const newTotalBalance = newFreeBalance + newPaidBalance;

      await tx.coinBalance.upsert({
        where: { userId },
        create: {
          userId,
          freeBalance: newFreeBalance,
          paidBalance: newPaidBalance,
          balance: newTotalBalance,
        },
        update: {
          freeBalance: newFreeBalance,
          paidBalance: newPaidBalance,
          balance: newTotalBalance,
        },
      });

      // 4. ShopOrder作成
      const order = await tx.shopOrder.create({
        data: {
          userId,
          itemId,
          quantity: 1,
          totalCoins: cost,
          status: 'completed',
        },
      });

      // 5. CoinTransaction作成
      await tx.coinTransaction.create({
        data: {
          userId,
          type: 'ITEM_PURCHASE',
          amount: -cost,
          balanceAfter: newTotalBalance,
          refId: order.id,
          characterId: item.characterId,
          description: `ショップ購入: ${item.name}`,
          metadata: {
            itemId: item.id,
            itemName: item.name,
            itemType: item.type,
            orderId: order.id,
          },
        },
      });

      // 在庫がある場合は減らす
      if (item.stock !== null) {
        await tx.shopItem.update({
          where: { id: itemId },
          data: { stock: { decrement: 1 } },
        });
      }

      return {
        order,
        newBalance: newTotalBalance,
        downloadUrl: item.fileUrl ?? null,
      };
    });

    logger.info('Shop purchase completed', {
      userId,
      itemId,
      orderId: result.order.id,
      newBalance: result.newBalance,
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      downloadUrl: result.downloadUrl,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'ITEM_NOT_FOUND':
          return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        case 'OUT_OF_STOCK':
          return NextResponse.json({ error: '売り切れです' }, { status: 400 });
        case 'ALREADY_PURCHASED':
          return NextResponse.json({ error: 'すでに購入済みです' }, { status: 400 });
        case 'INSUFFICIENT_COINS':
          return NextResponse.json({ error: 'コインが足りません' }, { status: 400 });
      }
    }

    logger.error('POST /api/shop/purchase failed', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
