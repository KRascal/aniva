/**
 * PUT /api/admin/approvals/[id]  — 承認/差し戻し/コメント
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
    const { action, actionBy, comment } = body;

    if (!action || !actionBy) {
      return NextResponse.json({ error: 'Missing action or actionBy' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'revision_requested', 'comment'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Create action record
    await prisma.approvalAction.create({
      data: {
        requestId: id,
        actionBy,
        action,
        comment: comment ?? null,
      },
    });

    // Update request status (unless it's just a comment)
    if (action !== 'comment') {
      await prisma.approvalRequest.update({
        where: { id },
        data: { status: action },
      });
    }

    const updated = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        character: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        actions: {
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ approval: updated });
  } catch (err) {
    console.error('[admin/approvals PUT]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
