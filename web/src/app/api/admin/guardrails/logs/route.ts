/**
 * GET /api/admin/guardrails/logs  — ガードレール発動ログ一覧
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const characterId = searchParams.get('characterId');
  const limit = parseInt(searchParams.get('limit') ?? '100');

  const logs = await prisma.guardrailLog.findMany({
    where: {
      ...(action && { action }),
      ...(characterId && { characterId }),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 500),
  });

  return NextResponse.json({ logs });
}
