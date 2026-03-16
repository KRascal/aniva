import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET: スタンプパック一覧取得（管理者用・全件）
export async function GET(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const pack = await prisma.stickerPack.findUnique({ where: { id } });
      if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ pack });
    }

    const [packs, total] = await prisma.$transaction([
      prisma.stickerPack.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { purchases: true } },
        },
      }),
      prisma.stickerPack.count(),
    ]);

    return NextResponse.json({ packs, total });
  } catch (error) {
    logger.error('[GET /api/admin/stickers]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: スタンプパック作成
export async function POST(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, description, price, stickers, isActive } = body as {
      name: string;
      description?: string;
      price?: number;
      stickers: { url: string; label?: string }[];
      isActive?: boolean;
    };

    if (!name || !stickers || !Array.isArray(stickers) || stickers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, stickers' },
        { status: 400 }
      );
    }

    const pack = await prisma.stickerPack.create({
      data: {
        name,
        description: description ?? null,
        price: price ?? 100,
        stickers,
        isActive: isActive ?? true,
      },
    });

    logger.info(`[POST /api/admin/stickers] Created pack ${pack.id} by ${ctx.email}`);
    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/stickers]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
