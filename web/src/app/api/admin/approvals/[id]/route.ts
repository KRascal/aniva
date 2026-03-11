import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, canApprove } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/approvals/[id] — リクエスト詳細
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('viewer');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const request = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      character: { select: { id: true, name: true, slug: true, avatarUrl: true, tenantId: true } },
      requester: { select: { email: true, name: true } },
      actions: {
        include: { actor: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // テナントスコープチェック
  if (
    ctx.role !== 'super_admin' &&
    ctx.tenantId &&
    request.character.tenantId !== ctx.tenantId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(request);
}

// POST /api/admin/approvals/[id] — アクション（承認/差し戻し/コメント）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { action, comment } = body;

  if (!action || !['approved', 'rejected', 'revision_requested', 'comment'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be one of: approved, rejected, revision_requested, comment' },
      { status: 400 }
    );
  }

  // 承認/差し戻しにはip_admin以上が必要
  const requiredRole = action === 'comment' ? 'editor' : 'ip_admin';
  const ctx = await requireRole(requiredRole as 'editor' | 'ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const request = await prisma.approvalRequest.findUnique({
    where: { id },
    include: { character: { select: { tenantId: true, systemPrompt: true } } },
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // テナントスコープチェック
  if (ctx.role !== 'super_admin' && request.character.tenantId !== ctx.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // AdminUserレコードを取得（または作成）
  let adminUser = await prisma.adminUser.findUnique({ where: { email: ctx.email } });
  if (!adminUser) {
    adminUser = await prisma.adminUser.create({
      data: { email: ctx.email, name: ctx.name, role: ctx.role, tenantId: ctx.tenantId },
    });
  }

  // アクション記録
  const approvalAction = await prisma.approvalAction.create({
    data: {
      requestId: id,
      actionById: adminUser.id,
      action,
      comment: comment ?? null,
    },
  });

  // ステータス更新（commentの場合はステータス変更なし）
  let updatedRequest = request;
  if (action !== 'comment') {
    const newStatus = action === 'approved' ? 'approved'
      : action === 'rejected' ? 'rejected'
      : 'revision_requested';

    await prisma.approvalRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    // 承認された場合、proposedValueを実際のCharacterに反映
    if (action === 'approved' && request.type === 'prompt_change') {
      const proposed = request.proposedValue as { systemPrompt?: string };
      if (proposed?.systemPrompt) {
        await prisma.character.update({
          where: { id: request.characterId },
          data: { systemPrompt: proposed.systemPrompt },
        });
      }
    }
  }

  await adminAudit(`approval_${action}`, ctx.email, {
    requestId: id, characterId: request.characterId, comment: comment ?? null,
  });

  return NextResponse.json({ ok: true, action, approvalActionId: approvalAction.id });
}

// DELETE /api/admin/approvals/[id] — リクエスト取り消し（pending状態のみ）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const request = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 409 });
  }

  await prisma.approvalRequest.delete({ where: { id } });
  await adminAudit('approval_request_cancel', ctx.email, { requestId: id });

  return NextResponse.json({ ok: true });
}
