import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/tenants/[id]/members — メンバー一覧
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const members = await prisma.adminUser.findMany({
    where: { tenantId: id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(members);
}

// POST /api/admin/tenants/[id]/members — メンバー追加（招待）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { email, name, role } = await req.json();

  if (!email || !name) {
    return NextResponse.json({ error: 'email and name are required' }, { status: 400 });
  }

  const validRoles = ['ip_admin', 'editor', 'viewer'];
  const assignRole = validRoles.includes(role) ? role : 'viewer';

  // テナント存在チェック
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // 既存メンバーチェック
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    // 既にAdminUserが存在する場合はテナント紐付けのみ更新
    const updated = await prisma.adminUser.update({
      where: { email },
      data: { tenantId: id, role: assignRole, isActive: true },
    });
    await adminAudit('member_reassign', ctx.email, {
      tenantId: id, memberId: updated.id, memberEmail: email, role: assignRole,
    });
    return NextResponse.json(updated);
  }

  // 新規作成
  const member = await prisma.adminUser.create({
    data: {
      email,
      name,
      role: assignRole,
      tenantId: id,
    },
  });

  await adminAudit('member_invite', ctx.email, {
    tenantId: id, memberId: member.id, memberEmail: email, role: assignRole,
  });

  return NextResponse.json(member, { status: 201 });
}

// PUT /api/admin/tenants/[id]/members — メンバー更新（ロール変更/無効化）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { memberId, role, isActive } = await req.json();

  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  const member = await prisma.adminUser.update({
    where: { id: memberId, tenantId: id },
    data: {
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  await adminAudit('member_update', ctx.email, {
    tenantId: id, memberId, changes: { role, isActive },
  });

  return NextResponse.json(member);
}

// DELETE /api/admin/tenants/[id]/members — メンバー削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');

  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { id: memberId, tenantId: id } });
  await adminAudit('member_remove', ctx.email, { tenantId: id, memberId });

  return NextResponse.json({ ok: true });
}
