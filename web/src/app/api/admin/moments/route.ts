import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const skip = (page - 1) * limit;

  const [moments, total] = await Promise.all([
    prisma.moment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        character: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { reactions: true } },
      },
    }),
    prisma.moment.count(),
  ]);

  return NextResponse.json({ moments, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterId, type, content, mediaUrl, visibility, scheduledAt } = body;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  const publishNow = !scheduledAt;

  const moment = await prisma.moment.create({
    data: {
      characterId,
      type: type || 'TEXT',
      content: content || null,
      mediaUrl: mediaUrl || null,
      visibility: visibility || 'PUBLIC',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      publishedAt: publishNow ? new Date() : null,
    },
    include: {
      character: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(moment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.moment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
