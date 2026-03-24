import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// PATCH: スタンプパック更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const existing = await prisma.stickerPack.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const { name, description, price, stickers, isActive } = body as {
      name?: string;
      description?: string;
      price?: number;
      stickers?: { url: string; label?: string }[];
      isActive?: boolean;
    };

    const pack = await prisma.stickerPack.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(stickers !== undefined && { stickers }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    logger.info(`[PATCH /api/admin/stickers/${id}] Updated by ${ctx.email}`);
    return NextResponse.json({ pack });
  } catch (error) {
    logger.error(`[PATCH /api/admin/stickers/${id}]`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: スタンプパック削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const existing = await prisma.stickerPack.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.stickerPack.delete({ where: { id } });

    logger.info(`[DELETE /api/admin/stickers/${id}] Deleted by ${ctx.email}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(`[DELETE /api/admin/stickers/${id}]`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
