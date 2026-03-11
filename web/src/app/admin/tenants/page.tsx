'use client';

import { useCallback, useEffect, useState } from 'react';

interface Tenant {
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
}

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = ['ip_admin', 'editor', 'viewer'] as const;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  ip_admin: 'IP Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-900/40 text-red-400 border-red-800/50',
  ip_admin: 'bg-purple-900/40 text-purple-400 border-purple-800/50',
  editor: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  viewer: 'bg-gray-800 text-gray-400 border-gray-700',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', logoUrl: '' });
  const [creating, setCreating] = useState(false);

  // Selected tenant & members
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', name: '', role: 'viewer' });
  const [addingMember, setAddingMember] = useState(false);

  // Edit tenant modal
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/tenants');
      if (!r.ok) throw new Error('Failed to load tenants');
      const data = await r.json();
      setTenants(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const loadMembers = async (tenantId: string) => {
    setMembersLoading(true);
    try {
      const r = await fetch(`/api/admin/tenants/${tenantId}/members`);
      const data = await r.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    }
    setMembersLoading(false);
  };

  const selectTenant = (tenantId: string) => {
    if (selectedTenantId === tenantId) {
      setSelectedTenantId(null);
      setMembers([]);
    } else {
      setSelectedTenantId(tenantId);
      loadMembers(tenantId);
    }
    setShowAddMember(false);
  };

  // Create tenant
  const handleCreate = async () => {
    if (!createForm.name || !createForm.slug) return;
    setCreating(true);
    try {
      const r = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!r.ok) {
        const data = await r.json();
        alert(data.error || 'エラー');
      } else {
        setShowCreate(false);
        setCreateForm({ name: '', slug: '', logoUrl: '' });
        loadTenants();
      }
    } catch {
      alert('通信エラー');
    }
    setCreating(false);
  };

  // Update tenant
  const handleUpdate = async () => {
    if (!editTenant) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/tenants/${editTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (r.ok) {
        setEditTenant(null);
        loadTenants();
      } else {
        const data = await r.json();
        alert(data.error || 'エラー');
      }
    } catch {
      alert('通信エラー');
    }
    setSaving(false);
  };

  // Toggle tenant active
  const toggleTenantActive = async (tenant: Tenant) => {
    try {
      const r = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      if (r.ok) loadTenants();
    } catch {
      alert('通信エラー');
    }
  };

  // Delete tenant
  const deleteTenant = async (id: string) => {
    if (!confirm('このテナントを削除しますか？')) return;
    try {
      const r = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
      if (r.ok) {
        if (selectedTenantId === id) {
          setSelectedTenantId(null);
          setMembers([]);
        }
        loadTenants();
      } else {
        const data = await r.json();
        alert(data.error || '削除できません');
      }
    } catch {
      alert('通信エラー');
    }
  };

  // Add member
  const handleAddMember = async () => {
    if (!selectedTenantId || !memberForm.email || !memberForm.name) return;
    setAddingMember(true);
    try {
      const r = await fetch(`/api/admin/tenants/${selectedTenantId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm),
      });
      if (r.ok) {
        setShowAddMember(false);
        setMemberForm({ email: '', name: '', role: 'viewer' });
        loadMembers(selectedTenantId);
      } else {
        const data = await r.json();
        alert(data.error || 'エラー');
      }
    } catch {
      alert('通信エラー');
    }
    setAddingMember(false);
  };

  // Update member role
  const updateMemberRole = async (memberId: string, role: string) => {
    if (!selectedTenantId) return;
    try {
      await fetch(`/api/admin/tenants/${selectedTenantId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      });
      loadMembers(selectedTenantId);
    } catch {
      alert('通信エラー');
    }
  };

  // Toggle member active
  const toggleMemberActive = async (memberId: string, isActive: boolean) => {
    if (!selectedTenantId) return;
    try {
      await fetch(`/api/admin/tenants/${selectedTenantId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, isActive: !isActive }),
      });
      loadMembers(selectedTenantId);
    } catch {
      alert('通信エラー');
    }
  };

  // Delete member
  const deleteMember = async (memberId: string) => {
    if (!selectedTenantId || !confirm('このメンバーを削除しますか？')) return;
    try {
      const r = await fetch(`/api/admin/tenants/${selectedTenantId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });
      if (r.ok) loadMembers(selectedTenantId);
      else {
        const data = await r.json();
        alert(data.error || '削除できません');
      }
    } catch {
      alert('通信エラー');
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">テナント管理</h1>
          <p className="text-gray-500 text-sm mt-1">マルチテナント環境の管理・メンバー設定</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + テナント作成
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tenants table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/40">
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">テナント</th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Slug</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">メンバー</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">キャラ</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">契約</th>
                <th className="text-center text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">状態</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      読み込み中...
                    </div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    テナントがありません
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => selectTenant(t.id)}
                    className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                      selectedTenantId === t.id
                        ? 'bg-purple-900/10 border-l-2 border-l-purple-600'
                        : 'hover:bg-gray-800/20'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {t.logoUrl ? (
                          <img src={t.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 text-sm font-bold">
                            {t.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-white text-sm font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded">{t.slug}</code>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{t._count.adminUsers}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{t._count.characters}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{t._count.contracts}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.isActive
                            ? 'bg-green-900/40 text-green-400 border border-green-800/50'
                            : 'bg-red-900/40 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {t.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditTenant(t);
                            setEditForm({ name: t.name, slug: t.slug, logoUrl: t.logoUrl || '' });
                          }}
                          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          title="編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleTenantActive(t)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            t.isActive
                              ? 'text-gray-500 hover:text-yellow-400 hover:bg-gray-800'
                              : 'text-gray-500 hover:text-green-400 hover:bg-gray-800'
                          }`}
                          title={t.isActive ? '無効化' : '有効化'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.isActive ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTenant(t.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member management panel */}
      {selectedTenant && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                {selectedTenant.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">{selectedTenant.name} — メンバー管理</h2>
                <p className="text-gray-500 text-xs">{members.length} メンバー</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + メンバー追加
            </button>
          </div>

          {/* Add member form (inline) */}
          {showAddMember && (
            <div className="p-4 border-b border-gray-800 bg-gray-950/40">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="メールアドレス"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
                />
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  placeholder="表示名"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
                />
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddMember}
                    disabled={addingMember || !memberForm.email || !memberForm.name}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {addingMember ? '追加中...' : '追加'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setMemberForm({ email: '', name: '', role: 'viewer' });
                    }}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Members table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/40">
                  <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-2.5">メンバー</th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-2.5">ロール</th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-2.5">最終ログイン</th>
                  <th className="text-center text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-2.5">状態</th>
                  <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        読み込み中...
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      メンバーがいません
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div>
                          <div className="text-white text-sm font-medium">{m.name}</div>
                          <div className="text-gray-500 text-xs">{m.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={m.role}
                          onChange={(e) => updateMemberRole(m.id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-sm">{formatDate(m.lastLoginAt)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.isActive
                              ? 'bg-green-900/40 text-green-400 border border-green-800/50'
                              : 'bg-red-900/40 text-red-400 border border-red-800/50'
                          }`}
                        >
                          {m.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleMemberActive(m.id, m.isActive)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              m.isActive
                                ? 'text-yellow-400 hover:bg-yellow-900/20'
                                : 'text-green-400 hover:bg-green-900/20'
                            }`}
                          >
                            {m.isActive ? '無効化' : '有効化'}
                          </button>
                          <button
                            onClick={() => deleteMember(m.id)}
                            className="px-2.5 py-1 rounded text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create tenant modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div
            className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">テナント作成</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">テナント名</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="例: Studio Alpha"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Slug（URLに使用）</label>
                <input
                  type="text"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="例: studio-alpha"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-500 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">ロゴURL（任意）</label>
                <input
                  type="url"
                  value={createForm.logoUrl}
                  onChange={(e) => setCreateForm({ ...createForm, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name || !createForm.slug}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit tenant modal */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditTenant(null)}>
          <div
            className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">テナント編集</h3>
              <button onClick={() => setEditTenant(null)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">テナント名</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Slug</label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">ロゴURL</label>
                <input
                  type="url"
                  value={editForm.logoUrl}
                  onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setEditTenant(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
