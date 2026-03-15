/**
 * GET  /api/admin/approvals  — 承認リクエスト一覧
 * POST /api/admin/approvals  — 新規承認リクエスト作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const approvals = await prisma.approvalRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      requester: { select: { id: true, name: true, email: true } },
      actions: {
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ approvals });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      characterId, type, title, description,
      previousValue, proposedValue, diffSummary,
      requestedBy, priority,
    } = body;

    if (!characterId || !type || !title || !proposedValue || !requestedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const approval = await prisma.approvalRequest.create({
      data: {
        characterId,
        type,
        title,
        description: description ?? null,
        previousValue: previousValue ?? null,
        proposedValue,
        diffSummary: diffSummary ?? null,
        requestedBy,
        priority: priority ?? 'normal',
      },
      include: {
        character: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ approval }, { status: 201 });
  } catch (err) {
    logger.error('[admin/approvals POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
