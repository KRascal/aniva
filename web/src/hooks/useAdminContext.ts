'use client';

import { useEffect, useState } from 'react';

export interface AdminContextData {
  authenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  role?: 'super_admin' | 'ip_admin' | 'editor' | 'viewer';
  tenantId?: string | null;
  tenantSlug?: string | null;
  isSuperAdmin?: boolean;
}

/**
 * 管理者のRBACコンテキストを取得するhook
 * レイアウトやコンポーネントでロール別表示制御に使用
 */
export function useAdminContext() {
  const [ctx, setCtx] = useState<AdminContextData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/auth-context')
      .then((r) => r.json())
      .then((data: AdminContextData) => {
        setCtx(data);
        setLoading(false);
      })
      .catch(() => {
        setCtx({ authenticated: false });
        setLoading(false);
      });
  }, []);

  return {
    ctx,
    loading,
    isSuperAdmin: ctx?.isSuperAdmin ?? false,
    canWrite: ctx?.role === 'super_admin' || ctx?.role === 'ip_admin' || ctx?.role === 'editor',
    canApprove: ctx?.role === 'super_admin' || ctx?.role === 'ip_admin',
    role: ctx?.role ?? null,
    tenantId: ctx?.tenantId ?? null,
  };
}
