import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/shop/purchase
 * コイン購入エンドポイント
 * - デジタル商品: コイン消費 → ファイルURLを即返す
 * - 物理商品: コイン or 円決済 → 注文受付（shippingAddress必須）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { itemId, quantity = 1, shippingAddress } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    // 商品取得
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (!item.isActive) {
      return NextResponse.json({ error: 'Item is not available' }, { status: 400 });
    }

    // 在庫チェック（物理商品）
    if (item.stock !== null) {
      if (item.stock < quantity) {
        return NextResponse.json({ error: '在庫が不足しています' }, { status: 400 });
      }
      // 物理商品は配送先住所が必要
      if (!shippingAddress) {
        return NextResponse.json({ error: '物理商品の購入には配送先住所が必要です' }, { status: 400 });
      }
    }

    const isPhysical = item.stock !== null;
    const totalCoins = item.priceCoins * quantity;

    // コイン残高チェック
    const coinBalance = await prisma.coinBalance.findUnique({ where: { userId } });
    const freeBalance = coinBalance?.freeBalance ?? 0;
    const paidBalance = coinBalance?.paidBalance ?? 0;
    const totalBalance = freeBalance + paidBalance;

    if (totalBalance < totalCoins) {
      return NextResponse.json({ error: 'コインが不足しています', success: false }, { status: 402 });
    }

    // コイン消費（free優先）
    const freeSpend = Math.min(freeBalance, totalCoins);
    const paidSpend = totalCoins - freeSpend;
    const newFree = freeBalance - freeSpend;
    const newPaid = paidBalance - paidSpend;
    const newTotal = newFree + newPaid;

    // トランザクション処理
    const [order] = await prisma.$transaction(async (tx) => {
      // コイン残高更新
      await tx.coinBalance.update({
        where: { userId },
        data: {
          freeBalance: newFree,
          paidBalance: newPaid,
          balance: newTotal,
        },
      });

      // コイン取引記録
      await tx.coinTransaction.create({
        data: {
          userId,
          type: 'ITEM_PURCHASE',
          amount: -totalCoins,
          balanceAfter: newTotal,
          characterId: item.characterId,
          description: `ショップ購入: ${item.name} ×${quantity}`,
          metadata: { itemId: item.id, itemType: item.type, quantity },
        },
      });

      // 在庫減算（物理商品）
      if (isPhysical) {
        await tx.shopItem.update({
          where: { id: itemId },
          data: { stock: { decrement: quantity } },
        });
      }

      // 注文作成
      const newOrder = await tx.shopOrder.create({
        data: {
          userId,
          itemId,
          quantity,
          totalCoins,
          status: isPhysical ? 'completed' : 'completed',
          shippingAddress: shippingAddress ?? null,
        },
        include: {
          item: { select: { id: true, name: true, type: true, fileUrl: true, imageUrl: true } },
        },
      });

      return [newOrder];
    });

    // デジタル商品: ダウンロードURLを返す
    const isDigital = item.type.startsWith('digital_') || item.fileUrl;
    const response: Record<string, unknown> = {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        item: {
          id: order.item.id,
          name: order.item.name,
          type: order.item.type,
          imageUrl: order.item.imageUrl,
        },
        quantity: order.quantity,
        totalCoins: order.totalCoins,
        createdAt: order.createdAt,
      },
      coinBalanceAfter: newTotal,
    };

    if (isDigital && item.fileUrl) {
      response.downloadUrl = item.fileUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[POST /api/shop/purchase]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
