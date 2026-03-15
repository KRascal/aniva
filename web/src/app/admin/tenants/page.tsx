'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ---- Types ----
interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    adminUsers: number;
    characters: number;
    contracts: number;
  };
  // 追加: 収益データ（revenue APIから非同期で埋める）
  fcMembers?: number;
  monthlyRevenue?: number;
}

interface TenantForm {
  name: string;
  slug: string;
  logoUrl: string;
}

const EMPTY_FORM: TenantForm = { name: '', slug: '', logoUrl: '' };

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'スーパー管理者',
  ip_admin: 'IP管理者',
  editor: '編集者',
  viewer: '閲覧者',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-900/50 text-red-300',
  ip_admin: 'bg-purple-800/50 text-purple-300',
  editor: 'bg-blue-800/50 text-blue-300',
  viewer: 'bg-gray-700 text-gray-300',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [members, setMembers] = useState<AdminUserRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantsRes, revenueRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/revenue').catch(() => null),
      ]);
      const tenantsData = await tenantsRes.json();
      const rows: TenantRow[] = tenantsData.tenants ?? [];

      // 収益データをテナントにマージ
      if (revenueRes?.ok) {
        const revenueData = await revenueRes.json();
        const revByTenant = new Map<string, { fcMembers: number; monthlyRevenue: number }>();
        for (const t of revenueData.revenueByTenant ?? []) {
          revByTenant.set(t.tenantId, { fcMembers: t.fcMembers, monthlyRevenue: t.revenue });
        }
        for (const row of rows) {
          const rev = revByTenant.get(row.id);
          if (rev) {
            row.fcMembers = rev.fcMembers;
            row.monthlyRevenue = rev.monthlyRevenue;
          }
        }
      }

      setTenants(rows);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch members when a tenant is selected (placeholder - would need a members API)
  useEffect(() => {
    if (!selectedTenant) { setMembers([]); return; }
    setMembersLoading(true);
    // In a full implementation, this would fetch from /api/admin/tenants/[id]/members
    // For now, we show placeholder
    setMembers([]);
    setMembersLoading(false);
  }, [selectedTenant]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(t: TenantRow) {
    setEditId(t.id);
    setForm({ name: t.name, slug: t.slug, logoUrl: t.logoUrl ?? '' });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editId ? `/api/admin/tenants/${editId}` : '/api/admin/tenants';
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          logoUrl: form.logoUrl || null,
        }),
      });
      setModalOpen(false);
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('このテナントを削除しますか？')) return;
    await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
    if (selectedTenant === id) setSelectedTenant(null);
    fetchData();
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await fetch(`/api/admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    fetchData();
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">🏢 テナント・権限管理</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
          + テナント作成
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* テナント一覧 */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-gray-400 text-center py-12">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">テナント名</th>
                    <th className="text-left px-4 py-3">スラグ</th>
                    <th className="text-center px-4 py-3">メンバー</th>
                    <th className="text-center px-4 py-3">キャラ数</th>
                    <th className="text-center px-4 py-3">FC会員数</th>
                    <th className="text-right px-4 py-3">今月収益</th>
                    <th className="text-center px-4 py-3">状態</th>
                    <th className="text-right px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id}
                      onClick={() => setSelectedTenant(t.id)}
                      className={`border-b border-gray-800/50 cursor-pointer transition-colors ${selectedTenant === t.id ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {t.logoUrl && <img src={t.logoUrl} alt="" className="w-6 h-6 rounded" />}
                          <div>
                            <div className="text-white font-medium">{t.name}</div>
                            <Link
                              href={`/admin/ip-dashboard`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-purple-400 hover:text-purple-300"
                            >
                              IPダッシュボード →
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{t.slug}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{t._count.adminUsers}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{t._count.characters}</td>
                      <td className="px-4 py-3 text-center">
                        {t.fcMembers !== undefined ? (
                          <span className="text-violet-300 font-medium">{t.fcMembers.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.monthlyRevenue !== undefined ? (
                          <span className="text-emerald-400 font-medium tabular-nums">
                            {t.monthlyRevenue >= 10000
                              ? `¥${(t.monthlyRevenue / 10000).toFixed(1)}万`
                              : `¥${t.monthlyRevenue.toLocaleString()}`}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleActive(t.id, t.isActive); }}
                          className={`px-2 py-0.5 rounded text-xs ${t.isActive ? 'bg-green-700/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                          {t.isActive ? '有効' : '無効'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="text-purple-400 hover:text-purple-300 text-xs mr-3">編集</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">テナントがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* メンバーパネル */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-white font-bold mb-4">
            {selectedTenant ? `メンバー管理` : 'テナントを選択'}
          </h3>

          {selectedTenant && (
            <>
              <div className="text-xs text-gray-500 mb-3">
                {tenants.find(t => t.id === selectedTenant)?.name}
              </div>

              {membersLoading ? (
                <div className="text-gray-400 text-center py-6">読み込み中...</div>
              ) : members.length === 0 ? (
                <div className="text-gray-500 text-center py-6 text-sm">
                  メンバーAPI未実装<br />
                  <span className="text-xs text-gray-600">Phase 2で実装予定</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                      <div>
                        <div className="text-white text-sm">{m.name}</div>
                        <div className="text-gray-500 text-xs">{m.email}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[m.role] ?? 'bg-gray-700 text-gray-400'}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!selectedTenant && (
            <p className="text-gray-500 text-sm text-center py-6">左のテーブルからテナントを選択してください</p>
          )}
        </div>
      </div>

      {/* モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalOpen(false)}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{editId ? 'テナント編集' : 'テナント作成'}</h2>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>テナント名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="KADOKAWA" />
              </div>
              <div>
                <label className={labelCls}>スラグ</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} placeholder="kadokawa" />
              </div>
              <div>
                <label className={labelCls}>ロゴURL（任意）</label>
                <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? '保存中...' : editId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
