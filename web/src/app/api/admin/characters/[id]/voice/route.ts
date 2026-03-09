import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const voice = await prisma.characterVoice.findUnique({ where: { characterId: id } });
  return NextResponse.json(voice || null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  return NextResponse.json(voice);
}
