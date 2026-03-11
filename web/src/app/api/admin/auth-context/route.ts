import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';

/**
 * GET /api/admin/auth-context
 * 現在のログインユーザーのRBAC情報を返す
 * フロントエンドでロール別のUI表示制御に使用
 */
export async function GET() {
  // viewerロール以上なら誰でもアクセス可
  const ctx = await requireRole('viewer');

  if (!ctx) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      tenantId: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    userId: ctx.userId,
    email: ctx.email,
    name: ctx.name,
    role: ctx.role,
    tenantId: ctx.tenantId,
    tenantSlug: ctx.tenantSlug,
    isSuperAdmin: ctx.role === 'super_admin',
  });
}
