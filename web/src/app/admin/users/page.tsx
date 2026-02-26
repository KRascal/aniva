'use client';

import { useCallback, useEffect, useState } from 'react';

interface UserRow {
  id: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  createdAt: string;
  lastLogin: string | null;
  relationshipCount: number;
  coinBalance: number;
  activeSubscriptionCount: number;
}

interface UserDetail {
  id: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  createdAt: string;
  totalMessages: number;
  totalConversations: number;
  coinBalance: number;
  following: {
    characterId: string;
    name: string;
    avatarUrl: string | null;
    level: number;
    totalMessages: number;
  }[];
  fanclub: { characterId: string; name: string; avatarUrl: string | null }[];
  activeSubscriptions: { characterId: string; name: string; avatarUrl: string | null }[];
  recentActivity: {
    characterName: string;
    level: number;
    lastMessageAt: string | null;
    totalMessages: number;
  }[];
}

const PLANS = ['FREE', 'STANDARD', 'PREMIUM'];
const PLAN_FILTER_OPTIONS = ['', ...PLANS];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [planChanging, setPlanChanging] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (p = 1, s = search, pf = planFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (s) params.set('search', s);
    if (pf) params.set('plan', pf);
    const r = await fetch(`/api/admin/users?${params}`);
    const data = await r.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, planFilter]);

  useEffect(() => { load(page); }, [page, search, planFilter, load]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handlePlanFilter = (pf: string) => {
    setPlanFilter(pf);
    setPage(1);
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedUser(null);
    const r = await fetch(`/api/admin/users?id=${id}`);
    const data = await r.json();
    setSelectedUser(data);
    setDetailLoading(false);
  };

  const changePlan = async (userId: string, plan: string) => {
    setPlanChanging(userId);
    const r = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (r.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, plan } : prev);
      }
    }
    setPlanChanging(null);
  };

  const planColor = (plan: string) => {
    if (plan === 'PREMIUM') return 'text-yellow-400';
    if (plan === 'STANDARD') return 'text-purple-400';
    return 'text-gray-400';
  };

  const planBadge = (plan: string) => {
    if (plan === 'PREMIUM') return 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50';
    if (plan === 'STANDARD') return 'bg-purple-900/40 text-purple-400 border border-purple-800/50';
    return 'bg-gray-800 text-gray-400 border border-gray-700';
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">ユーザー管理</h1>
        <span className="text-gray-400 text-sm">
          {planFilter || search ? `${total.toLocaleString()} 件一致` : `総計 ${total.toLocaleString()} 人`}
        </span>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="メールアドレス・表示名で検索"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            検索
          </button>
          {(search || planFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPlanFilter('');
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              クリア
            </button>
          )}
        </div>
        {/* Plan filter buttons */}
        <div className="flex gap-1.5">
          {PLAN_FILTER_OPTIONS.map((p) => (
            <button
              key={p || 'ALL'}
              onClick={() => handlePlanFilter(p)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                planFilter === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {p || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/40">
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">ユーザー</th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">プラン</th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">登録日</th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">最終ログイン</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">関係数</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">コイン</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">FC加入</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      読み込み中...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    {search || planFilter ? '条件に一致するユーザーがいません' : 'ユーザーがいません'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(u.displayName || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white text-sm font-medium truncate max-w-[160px]">
                            {u.displayName || '—'}
                          </div>
                          <div className="text-gray-500 text-xs truncate max-w-[160px]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${planBadge(u.plan)}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(u.lastLogin)}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{u.relationshipCount}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-yellow-400 text-sm font-medium">
                        🪙 {u.coinBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.activeSubscriptionCount > 0 ? (
                        <span className="text-purple-400 text-sm font-medium">{u.activeSubscriptionCount}</span>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadDetail(u.id)}
                        className="text-purple-400 hover:text-purple-300 text-sm hover:underline"
                      >
                        詳細 →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-800">
            <span className="text-gray-500 text-sm">
              {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} / {total.toLocaleString()} 件
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg transition-colors"
              >← 前</button>
              <span className="text-gray-400 text-sm px-2">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg transition-colors"
              >次 →</button>
            </div>
          </div>
        )}
      </div>

      {/* User detail modal */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { if (!detailLoading) setSelectedUser(null); }}>
          <div
            className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                読み込み中...
              </div>
            ) : selectedUser && (
              <>
                {/* Header */}
                <div className="p-5 border-b border-gray-800 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-xl font-bold shrink-0">
                      {(selectedUser.displayName || selectedUser.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{selectedUser.displayName || '表示名なし'}</h3>
                      <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
                </div>

                <div className="p-5 space-y-5">
                  {/* KPI grid */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-800/60 rounded-lg p-3 text-center border border-gray-700/50">
                      <div className="text-gray-400 text-xs mb-1">プラン</div>
                      <div className={`font-bold text-sm ${planColor(selectedUser.plan)}`}>{selectedUser.plan}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3 text-center border border-gray-700/50">
                      <div className="text-gray-400 text-xs mb-1">メッセージ</div>
                      <div className="text-white font-bold">{selectedUser.totalMessages.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3 text-center border border-gray-700/50">
                      <div className="text-gray-400 text-xs mb-1">コイン</div>
                      <div className="text-yellow-400 font-bold">🪙 {selectedUser.coinBalance.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3 text-center border border-gray-700/50">
                      <div className="text-gray-400 text-xs mb-1">FC加入</div>
                      <div className="text-purple-400 font-bold">{selectedUser.fanclub.length}</div>
                    </div>
                  </div>

                  {/* Plan change */}
                  <div>
                    <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">プラン変更</label>
                    <div className="flex gap-2">
                      {PLANS.map((p) => (
                        <button
                          key={p}
                          disabled={selectedUser.plan === p || planChanging === selectedUser.id}
                          onClick={() => changePlan(selectedUser.id, p)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            selectedUser.plan === p
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                          } disabled:opacity-50`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent activity (character relationships) */}
                  {selectedUser.recentActivity.length > 0 && (
                    <div>
                      <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">最近の関係キャラ</label>
                      <div className="space-y-2">
                        {selectedUser.recentActivity.map((a, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2.5 border border-gray-700/50">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium">{a.characterName}</span>
                              <span className="bg-purple-900/50 text-purple-400 text-xs px-1.5 py-0.5 rounded">Lv.{a.level}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-300 text-xs">{a.totalMessages} msgs</div>
                              {a.lastMessageAt && (
                                <div className="text-gray-600 text-xs">
                                  {new Date(a.lastMessageAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FC subscriptions */}
                  {selectedUser.activeSubscriptions.length > 0 && (
                    <div>
                      <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">アクティブFC ({selectedUser.activeSubscriptions.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.activeSubscriptions.map((s) => (
                          <span key={s.characterId} className="bg-purple-900/40 text-purple-300 text-xs px-2.5 py-1 rounded-full border border-purple-800/50">
                            👑 {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Following */}
                  {selectedUser.following.length > 0 && (
                    <div>
                      <label className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2 block">フォロー中 ({selectedUser.following.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.following.map((c) => (
                          <span key={c.characterId} className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full border border-gray-700">
                            {c.name} <span className="text-gray-500">Lv.{c.level}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-gray-600 text-xs">
                    登録日: {new Date(selectedUser.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-800">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                  >閉じる</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
