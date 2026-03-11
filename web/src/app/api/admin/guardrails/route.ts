import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/guardrails — ガードレールルール一覧
export async function GET(req: NextRequest) {
  const ctx = await requireRole('viewer');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get('characterId');
  const ruleType = searchParams.get('ruleType');
  const category = searchParams.get('category');
  const global = searchParams.get('global'); // "true" = グローバルルールのみ

  const rules = await prisma.guardrailRule.findMany({
    where: {
      ...(global === 'true' ? { characterId: null } : {}),
      ...(characterId ? { characterId } : {}),
      ...(ruleType ? { ruleType } : {}),
      ...(category ? { category } : {}),
      ...(ctx.role !== 'super_admin' && ctx.tenantId
        ? {
            OR: [
              { tenantId: ctx.tenantId },
              { tenantId: null, characterId: null }, // グローバルルールは全員閲覧可
            ],
          }
        : {}),
      isActive: true,
    },
    include: {
      character: { select: { name: true, slug: true } },
    },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(rules);
}

// POST /api/admin/guardrails — ガードレールルール作成
export async function POST(req: NextRequest) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    characterId, ruleType, category, severity,
    pattern, description, ageRating, regions, fallbackMessage,
  } = await req.json();

  if (!ruleType || !category) {
    return NextResponse.json({ error: 'ruleType and category are required' }, { status: 400 });
  }

  // テナントスコープ: super_admin以外は自テナントのみ
  const effectiveTenantId = ctx.role === 'super_admin' ? null : ctx.tenantId;

  const rule = await prisma.guardrailRule.create({
    data: {
      characterId: characterId ?? null,
      tenantId: effectiveTenantId,
      ruleType,
      category,
      severity: severity ?? 'block',
      pattern: pattern ?? null,
      description: description ?? null,
      ageRating: ageRating ?? null,
      regions: regions ?? [],
      fallbackMessage: fallbackMessage ?? null,
    },
  });

  await adminAudit('guardrail_create', ctx.email, {
    ruleId: rule.id, ruleType, category, characterId,
  });

  return NextResponse.json(rule, { status: 201 });
}
