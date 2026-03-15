import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ─── GET /api/admin/events/[id] ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const event = await prisma.limitedScenario.findUnique({
      where: { id },
      include: { character: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(event);
  } catch (error) {
    logger.error('[GET /api/admin/events/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── PATCH /api/admin/events/[id] ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    const allowed = ['title', 'description', 'content', 'startsAt', 'endsAt', 'isActive', 'characterId'];

    for (const field of allowed) {
      if (field in body) {
        if (field === 'startsAt' || field === 'endsAt') {
          data[field] = new Date(body[field] as string);
        } else {
          data[field] = body[field];
        }
      }
    }

    const updated = await prisma.limitedScenario.update({
      where: { id },
      data,
      include: { character: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    logger.error('[PATCH /api/admin/events/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/admin/events/[id] ───────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    await prisma.limitedScenario.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    logger.error('[DELETE /api/admin/events/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
