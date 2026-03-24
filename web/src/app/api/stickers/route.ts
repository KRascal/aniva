import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET: 購入可能なスタンプパック一覧（公開用・認証不要）
export async function GET() {
  try {
    const packs = await prisma.stickerPack.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stickers: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ packs });
  } catch (error) {
    logger.error('[GET /api/stickers]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
