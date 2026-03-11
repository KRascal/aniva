import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// PUT /api/admin/guardrails/[id] — ルール更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const rule = await prisma.guardrailRule.update({
    where: { id },
    data: {
      ...(body.ruleType !== undefined && { ruleType: body.ruleType }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.severity !== undefined && { severity: body.severity }),
      ...(body.pattern !== undefined && { pattern: body.pattern }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.ageRating !== undefined && { ageRating: body.ageRating }),
      ...(body.regions !== undefined && { regions: body.regions }),
      ...(body.fallbackMessage !== undefined && { fallbackMessage: body.fallbackMessage }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  await adminAudit('guardrail_update', ctx.email, { ruleId: id, changes: Object.keys(body) });

  return NextResponse.json(rule);
}

// DELETE /api/admin/guardrails/[id] — ルール削除（論理削除）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // 物理削除ではなく論理削除（isActive=false）
  await prisma.guardrailRule.update({
    where: { id },
    data: { isActive: false },
  });

  await adminAudit('guardrail_deactivate', ctx.email, { ruleId: id });

  return NextResponse.json({ ok: true });
}
