import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ─── GET /api/admin/events ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get('characterId');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (characterId) where.characterId = characterId;

    const [events, total] = await prisma.$transaction([
      prisma.limitedScenario.findMany({
        where,
        include: { character: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { startsAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.limitedScenario.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, limit });
  } catch (error) {
    logger.error('[GET /api/admin/events]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/admin/events ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { characterId, title, description, content, startsAt, endsAt, isActive } = body;

    if (!characterId || !title || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: 'characterId, title, startsAt, endsAt は必須です' },
        { status: 400 }
      );
    }

    const event = await prisma.limitedScenario.create({
      data: {
        characterId,
        title,
        description: description ?? null,
        content: content ?? '',
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive: isActive ?? true,
      },
      include: { character: { select: { id: true, name: true } } },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/events]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
