import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const voice = await prisma.characterVoice.findUnique({ where: { characterId: id } });
  return NextResponse.json(voice || null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const data = await req.json();

  const voice = await prisma.characterVoice.upsert({
    where: { characterId: id },
    create: {
      characterId: id,
      firstPerson: data.firstPerson || '俺',
      secondPerson: data.secondPerson || 'お前',
      sentenceEndings: data.sentenceEndings || [],
      exclamations: data.exclamations || [],
      laughStyle: data.laughStyle || null,
      angryStyle: data.angryStyle || null,
      sadStyle: data.sadStyle || null,
      toneNotes: data.toneNotes || null,
      speechExamples: data.speechExamples || [],
      locale: data.locale || 'ja',
    },
    update: {
      firstPerson: data.firstPerson,
      secondPerson: data.secondPerson,
      sentenceEndings: data.sentenceEndings,
      exclamations: data.exclamations,
      laughStyle: data.laughStyle,
      angryStyle: data.angryStyle,
      sadStyle: data.sadStyle,
      toneNotes: data.toneNotes,
      speechExamples: data.speechExamples,
      locale: data.locale,
    },
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.CHARACTER_VOICE_UPDATE, ctx.email, {
    characterId: id,
  });

  return NextResponse.json(voice);
}
