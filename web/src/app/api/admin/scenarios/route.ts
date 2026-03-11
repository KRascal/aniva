/**
 * GET  /api/admin/scenarios  — 全シナリオ一覧
 * POST /api/admin/scenarios  — 新規シナリオ作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scenarios = await prisma.limitedScenario.findMany({
    include: {
      character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      readers: { select: { userId: true } },
    },
    orderBy: { startsAt: 'desc' },
  });

  const now = new Date();
  const result = scenarios.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    isActive: s.isActive,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    isExpired: s.endsAt < now,
    isLive: s.isActive && s.startsAt <= now && s.endsAt >= now,
    readCount: s.readers.length,
    character: s.character,
    contentPreview: s.content.slice(0, 120) + (s.content.length > 120 ? '...' : ''),
    createdAt: s.createdAt.toISOString(),
  }));

  return NextResponse.json({ scenarios: result });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { characterId, title, description, content, startsAt, endsAt, isActive } = body;

    if (!characterId || !title || !content || !startsAt || !endsAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const scenario = await prisma.limitedScenario.create({
      data: {
        characterId,
        title,
        description: description ?? null,
        content,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive: isActive ?? true,
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.SCENARIO_CREATE, admin.email, {
      scenarioId: scenario.id, title, characterId,
    });

    return NextResponse.json({ scenario }, { status: 201 });
  } catch (err) {
    console.error('[admin/scenarios POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
