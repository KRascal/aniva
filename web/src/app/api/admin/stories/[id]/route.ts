import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ─── GET /api/admin/stories/[id] ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const chapter = await prisma.storyChapter.findUnique({
      where: { id },
      include: { character: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(chapter);
  } catch (error) {
    logger.error('[GET /api/admin/stories/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── PATCH /api/admin/stories/[id] ───────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();

    // Pick only updatable fields
    const data: Record<string, unknown> = {};
    const allowedFields = [
      'title',
      'synopsis',
      'triggerPrompt',
      'unlockLevel',
      'isFcOnly',
      'isActive',
      'backgroundUrl',
      'bgmType',
      'characterPose',
      'coinReward',
      'choices',
      'locale',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (typeof data.unlockLevel === 'string') data.unlockLevel = parseInt(data.unlockLevel as string, 10);
    if (typeof data.coinReward === 'string') data.coinReward = parseInt(data.coinReward as string, 10);

    const updated = await prisma.storyChapter.update({
      where: { id },
      data,
      include: { character: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    logger.error('[PATCH /api/admin/stories/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/admin/stories/[id] ──────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    await prisma.storyChapter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    logger.error('[DELETE /api/admin/stories/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
