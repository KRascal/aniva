/**
 * GET  /api/admin/guardrails  — ガードレールルール一覧
 * POST /api/admin/guardrails  — 新規ルール作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const characterId = searchParams.get('characterId');

  const rules = await prisma.guardrailRule.findMany({
    where: {
      ...(category && { category }),
      ...(characterId ? { characterId } : {}),
    },
    include: {
      character: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      characterId, tenantId, ruleType, category, severity,
      pattern, description, ageRating, regions, fallbackMessage, isActive,
    } = body;

    if (!ruleType || !category) {
      return NextResponse.json({ error: 'Missing ruleType or category' }, { status: 400 });
    }

    const rule = await prisma.guardrailRule.create({
      data: {
        characterId: characterId ?? null,
        tenantId: tenantId ?? null,
        ruleType,
        category,
        severity: severity ?? 'block',
        pattern: pattern ?? null,
        description: description ?? null,
        ageRating: ageRating ?? null,
        regions: regions ?? [],
        fallbackMessage: fallbackMessage ?? null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    logger.error('[admin/guardrails POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
