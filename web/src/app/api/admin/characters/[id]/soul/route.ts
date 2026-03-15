import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const soul = await prisma.characterSoul.findUnique({ where: { characterId: id } });
  return NextResponse.json(soul || null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  await adminAudit(ADMIN_AUDIT_ACTIONS.CHARACTER_SOUL_UPDATE, ctx.email, {
    characterId: id,
  });

  return NextResponse.json(soul);
}
