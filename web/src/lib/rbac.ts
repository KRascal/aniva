import { auth } from './auth';
import { prisma } from './prisma';
import { isAdminEmail } from './admin';

// ── ロール定義 ──
export type AdminRole = 'super_admin' | 'ip_admin' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  ip_admin: 50,
  editor: 30,
  viewer: 10,
};

// ── 認証結果型 ──
export interface AdminContext {
  userId: string;       // AdminUser.id
  email: string;
  name: string;
  role: AdminRole;
  tenantId: string | null;
  tenantSlug: string | null;
}

// ── メイン認証関数 ──

/**
 * 管理者認証 + ロールチェック
 * 既存のADMIN_EMAILS方式と新RBAC方式の両方をサポート（後方互換性）
 * 
 * @param minRole 最低必要ロール（デフォルト: viewer）
 * @returns AdminContext or null（権限不足時）
 */
export async function requireRole(minRole: AdminRole = 'viewer'): Promise<AdminContext | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const email = session.user.email;

  // 1. 新RBAC: AdminUserテーブルから検索
  const adminUser = await prisma.adminUser.findUnique({
    where: { email },
    include: { tenant: { select: { slug: true } } },
  });

  if (adminUser && adminUser.isActive) {
    const role = adminUser.role as AdminRole;
    if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]) {
      // lastLoginAt更新（非同期、エラー無視）
      prisma.adminUser.update({
        where: { id: adminUser.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {});

      return {
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role,
        tenantId: adminUser.tenantId,
        tenantSlug: adminUser.tenant?.slug ?? null,
      };
    }
    return null; // ロール不足
  }

  // 2. 後方互換: ADMIN_EMAILS環境変数に含まれる場合はsuper_adminとして扱う
  const isLegacyAdmin = await isAdminEmail(email);
  if (isLegacyAdmin) {
    return {
      userId: 'legacy',
      email,
      name: email.split('@')[0],
      role: 'super_admin',
      tenantId: null,
      tenantSlug: null,
    };
  }

  return null;
}

// ── テナントスコープヘルパー ──

/**
 * テナントに基づいてPrismaのwhere条件を生成
 * super_adminはテナント制限なし、ip_admin以下は自テナントのみ
 */
export function tenantScope(ctx: AdminContext): { tenantId?: string } {
  if (ctx.role === 'super_admin') return {}; // 全テナント
  if (ctx.tenantId) return { tenantId: ctx.tenantId };
  return { tenantId: 'NONE' }; // テナント未割当は何も見えない
}

/**
 * キャラクターへのアクセス権チェック
 */
export async function canAccessCharacter(ctx: AdminContext, characterId: string): Promise<boolean> {
  if (ctx.role === 'super_admin') return true;
  if (!ctx.tenantId) return false;

  const char = await prisma.character.findUnique({
    where: { id: characterId },
    select: { tenantId: true },
  });

  return char?.tenantId === ctx.tenantId;
}

// ── ロールチェックヘルパー ──

export function hasRole(ctx: AdminContext, minRole: AdminRole): boolean {
  return ROLE_HIERARCHY[ctx.role] >= ROLE_HIERARCHY[minRole];
}

export function isSuperAdmin(ctx: AdminContext): boolean {
  return ctx.role === 'super_admin';
}

export function canWrite(ctx: AdminContext): boolean {
  return hasRole(ctx, 'editor');
}

export function canApprove(ctx: AdminContext): boolean {
  return hasRole(ctx, 'ip_admin');
}
