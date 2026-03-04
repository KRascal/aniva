import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterId, status, emoji, manualMode } = body;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId は必須です' }, { status: 400 });
  }

  const character = await prisma.character.update({
    where: { id: characterId },
    data: {
      presenceManualMode: manualMode ?? false,
      presenceStatus: manualMode ? (status ?? null) : null,
      presenceEmoji: manualMode ? (emoji ?? null) : null,
    },
    select: { id: true, presenceManualMode: true, presenceStatus: true, presenceEmoji: true },
  });

  return NextResponse.json(character);
}
