import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, tenantScope, canAccessCharacter } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/approvals — 承認リクエスト一覧
export async function GET(req: NextRequest) {
  const ctx = await requireRole('viewer');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const characterId = searchParams.get('characterId');

  // テナントスコープ: 自テナントのキャラのみ
  let characterFilter: { id?: string; tenantId?: string } = {};
  if (ctx.role !== 'super_admin' && ctx.tenantId) {
    characterFilter = { tenantId: ctx.tenantId };
  }

  const requests = await prisma.approvalRequest.findMany({
    where: {
      ...(characterId ? { characterId } : {}),
      ...(status ? { status } : {}),
      character: Object.keys(characterFilter).length > 0 ? characterFilter : undefined,
    },
    include: {
      character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      requester: { select: { id: true, email: true, name: true } },
      actions: {
        include: { actor: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { status: 'asc' }, // pending先頭
      { createdAt: 'desc' },
    ],
  });

  return NextResponse.json(requests);
}

// POST /api/admin/approvals — 承認リクエスト作成
export async function POST(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { characterId, type, title, description, previousValue, proposedValue, diffSummary, priority } = await req.json();

  if (!characterId || !type || !title || proposedValue === undefined) {
    return NextResponse.json(
      { error: 'characterId, type, title, proposedValue are required' },
      { status: 400 }
    );
  }

  // アクセス権チェック
  const hasAccess = await canAccessCharacter(ctx, characterId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: no access to this character' }, { status: 403 });
  }

  // AdminUserレコードを取得（または作成）
  let adminUser = await prisma.adminUser.findUnique({ where: { email: ctx.email } });
  if (!adminUser) {
    // legacy admin（ADMIN_EMAILS経由）の場合は自動作成
    adminUser = await prisma.adminUser.create({
      data: {
        email: ctx.email,
        name: ctx.name,
        role: ctx.role,
        tenantId: ctx.tenantId,
      },
    });
  }

  const request = await prisma.approvalRequest.create({
    data: {
      characterId,
      type,
      title,
      description: description ?? null,
      previousValue: previousValue ?? null,
      proposedValue,
      diffSummary: diffSummary ?? null,
      status: 'pending',
      requestedById: adminUser.id,
      priority: priority ?? 'normal',
    },
    include: {
      character: { select: { name: true } },
      requester: { select: { email: true, name: true } },
    },
  });

  await adminAudit('approval_request_create', ctx.email, {
    requestId: request.id, characterId, type, title,
  });

  return NextResponse.json(request, { status: 201 });
}
