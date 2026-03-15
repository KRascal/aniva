import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function PUT(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  await adminAudit(ADMIN_AUDIT_ACTIONS.CHARACTER_PRESENCE_UPDATE, ctx.email, {
    characterId, manualMode: manualMode ?? false, status: status ?? null,
  });

  return NextResponse.json(character);
}
