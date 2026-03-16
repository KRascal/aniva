import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST: スタンプパック購入（コイン消費）
export async function POST(req: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { stickerPackId } = body as { stickerPackId: string };

    if (!stickerPackId) {
      return NextResponse.json({ error: 'stickerPackId is required' }, { status: 400 });
    }

    // パックの存在確認
    const pack = await prisma.stickerPack.findUnique({
      where: { id: stickerPackId, isActive: true },
    });
    if (!pack) {
      return NextResponse.json({ error: 'Sticker pack not found or inactive' }, { status: 404 });
    }

    // 購入済みチェック
    const existingPurchase = await prisma.userSticker.findUnique({
      where: { userId_stickerPackId: { userId, stickerPackId } },
    });
    if (existingPurchase) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 409 });
    }

    // コイン残高チェック
    const coinBalance = await prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });

    if (coinBalance.balance < pack.price) {
      return NextResponse.json(
        { error: 'コインが足りません', required: pack.price, current: coinBalance.balance },
        { status: 400 }
      );
    }

    // トランザクション: コイン消費 + 購入レコード作成
    const [updatedBalance, purchase] = await prisma.$transaction([
      prisma.coinBalance.update({
        where: { userId },
        data: { balance: { decrement: pack.price } },
      }),
      prisma.userSticker.create({
        data: { userId, stickerPackId },
      }),
    ]);

    logger.info(`[POST /api/stickers/purchase] User ${userId} purchased pack ${stickerPackId}`);

    return NextResponse.json({
      ok: true,
      purchase,
      coinBalance: updatedBalance.balance,
    });
  } catch (error) {
    logger.error('[POST /api/stickers/purchase]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
