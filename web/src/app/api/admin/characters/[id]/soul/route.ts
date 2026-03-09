import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const soul = await prisma.characterSoul.findUnique({ where: { characterId: id } });
  return NextResponse.json(soul || null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const data = await req.json();

  const soul = await prisma.characterSoul.upsert({
    where: { characterId: id },
    create: {
      characterId: id,
      coreIdentity: data.coreIdentity || '',
      motivation: data.motivation || '',
      worldview: data.worldview || '',
      timelinePosition: data.timelinePosition || null,
      backstory: data.backstory || null,
      relationshipMap: data.relationshipMap || {},
      personalityAxes: data.personalityAxes || {},
      emotionalPatterns: data.emotionalPatterns || {},
    },
    update: {
      coreIdentity: data.coreIdentity,
      motivation: data.motivation,
      worldview: data.worldview,
      timelinePosition: data.timelinePosition,
      backstory: data.backstory,
      relationshipMap: data.relationshipMap,
      personalityAxes: data.personalityAxes,
      emotionalPatterns: data.emotionalPatterns,
    },
  });

  return NextResponse.json(soul);
}
