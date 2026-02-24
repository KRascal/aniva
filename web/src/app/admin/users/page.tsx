'use client';

import { useEffect, useState } from 'react';

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  createdAt: string;
  lastLogin: string | null;
  relationshipCount: number;
}

interface UserDetail {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  createdAt: string;
  totalMessages: number;
  following: { characterId: string; name: string; avatarUrl: string | null }[];
  fanclub: { characterId: string; name: string; avatarUrl: string | null }[];
}

const PLANS = ['FREE', 'STANDARD', 'PREMIUM'];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [planChanging, setPlanChanging] = useState<string | null>(null);

  const load = async (p = 1) => {
    setLoading(true);
    const r = await fetch(`/api/admin/users?page=${p}`);
    const data = await r.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const loadDetail = async (id: string) => {
    const r = await fetch(`/api/admin/users?id=${id}`);
    const data = await r.json();
    setSelectedUser(data);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">ユーザー管理</h1>
        <span className="text-gray-400 text-sm">総計: {total.toLocaleString()} 人</span>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm px-4 py-3">メール</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">表示名</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">プラン</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">登録日</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">関係数</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">読み込み中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">ユーザーがいません</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{u.displayName || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        disabled={planChanging === u.id}
                        onChange={(e) => changePlan(u.id, e.target.value)}
                        className={`bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none ${planColor(u.plan)}`}
                      >
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(u.createdAt).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{u.relationshipCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadDetail(u.id)}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >詳細</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-800">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded"
            >←</button>
            <span className="text-gray-400 text-sm">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded"
            >→</button>
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{selectedUser.email}</h3>
                <p className="text-gray-400 text-sm">{selectedUser.displayName || '表示名なし'}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">プラン</div>
                <div className={`font-bold ${planColor(selectedUser.plan)}`}>{selectedUser.plan}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">総メッセージ</div>
                <div className="text-white font-bold">{selectedUser.totalMessages.toLocaleString()}</div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-gray-400 text-sm mb-2">フォロー中キャラ ({selectedUser.following.length})</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser.following.length === 0
                  ? <span className="text-gray-600 text-sm">なし</span>
                  : selectedUser.following.map((c) => (
                    <span key={c.characterId} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">{c.name}</span>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="text-gray-400 text-sm mb-2">ファンクラブ加入 ({selectedUser.fanclub.length})</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser.fanclub.length === 0
                  ? <span className="text-gray-600 text-sm">なし</span>
                  : selectedUser.fanclub.map((c) => (
                    <span key={c.characterId} className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded">{c.name}</span>
                  ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <select
                value={selectedUser.plan}
                onChange={(e) => changePlan(selectedUser.id, e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              >
                {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm"
              >閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
