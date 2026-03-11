import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, canAccessCharacter } from '@/lib/rbac';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

/**
 * POST /api/admin/emergency-stop
 * キャラクターを即座にオフライン化する緊急停止
 * ip_admin以上のみ実行可能
 * 
 * body: { characterId: string, reason?: string }
 * 
 * DELETE /api/admin/emergency-stop
 * 緊急停止を解除する（isActive=true, emergencyStop=false）
 */
export async function POST(req: NextRequest) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { characterId, reason } = await req.json();
  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  // アクセス権チェック
  const hasAccess = await canAccessCharacter(ctx, characterId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: no access to this character' }, { status: 403 });
  }

  const char = await prisma.character.update({
    where: { id: characterId },
    data: {
      isActive: false,
      emergencyStop: true,
      emergencyStopAt: new Date(),
      emergencyStopBy: ctx.email,
    },
    select: { id: true, name: true, slug: true },
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.CHARACTER_EMERGENCY_STOP, ctx.email, {
    characterId, characterName: char.name, reason: reason ?? null,
  });

  return NextResponse.json({
    ok: true,
    message: `${char.name} を緊急停止しました`,
    characterId: char.id,
    stoppedAt: new Date().toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get('characterId');

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  const hasAccess = await canAccessCharacter(ctx, characterId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const char = await prisma.character.update({
    where: { id: characterId },
    data: {
      isActive: true,
      emergencyStop: false,
      emergencyStopAt: null,
      emergencyStopBy: null,
    },
    select: { id: true, name: true },
  });

  await adminAudit('character_emergency_stop_release', ctx.email, {
    characterId, characterName: char.name,
  });

  return NextResponse.json({
    ok: true,
    message: `${char.name} の緊急停止を解除しました`,
  });
}
