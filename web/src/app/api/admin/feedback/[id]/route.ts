import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

// PATCH /api/admin/feedback/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await prisma.characterFeedback.update({
    where: { id },
    data: { status },
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.FEEDBACK_STATUS_UPDATE, 'system', {
    feedbackId: id, status,
  });

  return NextResponse.json({ ok: true });
}
