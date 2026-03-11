/**
 * PUT    /api/admin/guardrails/[id]  — ルール更新
 * DELETE /api/admin/guardrails/[id]  — ルール削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const {
      ruleType, category, severity, pattern, description,
      ageRating, regions, fallbackMessage, isActive, characterId, tenantId,
    } = body;

    const updated = await prisma.guardrailRule.update({
      where: { id },
      data: {
        ...(ruleType !== undefined && { ruleType }),
        ...(category !== undefined && { category }),
        ...(severity !== undefined && { severity }),
        ...(pattern !== undefined && { pattern }),
        ...(description !== undefined && { description }),
        ...(ageRating !== undefined && { ageRating }),
        ...(regions !== undefined && { regions }),
        ...(fallbackMessage !== undefined && { fallbackMessage }),
        ...(isActive !== undefined && { isActive }),
        ...(characterId !== undefined && { characterId }),
        ...(tenantId !== undefined && { tenantId }),
      },
    });

    return NextResponse.json({ rule: updated });
  } catch (err) {
    console.error('[admin/guardrails PUT]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.guardrailRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/guardrails DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
