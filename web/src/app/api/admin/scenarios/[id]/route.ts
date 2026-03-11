/**
 * GET    /api/admin/scenarios/[id]  — シナリオ詳細（content含む）
 * PATCH  /api/admin/scenarios/[id]  — 更新
 * DELETE /api/admin/scenarios/[id]  — 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const scenario = await prisma.limitedScenario.findUnique({
    where: { id },
    include: {
      character: { select: { id: true, name: true, slug: true } },
      readers: { select: { userId: true, readAt: true } },
    },
  });

  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ scenario });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { title, description, content, startsAt, endsAt, isActive } = body;

    const updated = await prisma.limitedScenario.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
        ...(endsAt !== undefined && { endsAt: new Date(endsAt) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.SCENARIO_UPDATE, admin.email, {
      scenarioId: id,
    });

    return NextResponse.json({ scenario: updated });
  } catch (err) {
    console.error('[admin/scenarios PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.limitedScenario.delete({ where: { id } });

    await adminAudit(ADMIN_AUDIT_ACTIONS.SCENARIO_DELETE, admin.email, {
      scenarioId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/scenarios DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
