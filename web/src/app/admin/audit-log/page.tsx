'use client';

import { useEffect, useState, useCallback } from 'react';

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  adminUser: { id: string; email: string; name: string | null };
}

interface FiltersData {
  actions: string[];
  targetTypes: string[];
  adminUsers: { id: string; email: string; name: string | null }[];
}

interface ApiResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: FiltersData;
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-900 text-green-300',
  UPDATE: 'bg-blue-900 text-blue-300',
  DELETE: 'bg-red-900 text-red-300',
  APPROVE: 'bg-purple-900 text-purple-300',
  REJECT: 'bg-orange-900 text-orange-300',
  EMERGENCY_STOP: 'bg-red-800 text-red-200 font-bold',
};

function badgeClass(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_BADGE)) {
    if (action.toUpperCase().includes(key)) return cls;
  }
  return 'bg-gray-700 text-gray-300';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLogPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (filterAction) params.set('action', filterAction);
    if (filterTargetType) params.set('targetType', filterTargetType);
    if (filterAdmin) params.set('adminUserId', filterAdmin);

    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('データの取得に失敗しました'); setLoading(false); });
  }, [page, filterAction, filterTargetType, filterAdmin]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">監査ログ</h1>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
        >
          🔄 更新
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">操作タイプ</label>
          <select
            className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); handleFilterChange(); }}
          >
            <option value="">すべて</option>
            {data?.filters.actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">対象タイプ</label>
          <select
            className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
            value={filterTargetType}
            onChange={(e) => { setFilterTargetType(e.target.value); handleFilterChange(); }}
          >
            <option value="">すべて</option>
            {data?.filters.targetTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">管理者</label>
          <select
            className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
            value={filterAdmin}
            onChange={(e) => { setFilterAdmin(e.target.value); handleFilterChange(); }}
          >
            <option value="">すべて</option>
            {data?.filters.adminUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
        </div>
        {data && (
          <div className="flex items-end">
            <span className="text-gray-500 text-sm">合計 {data.total.toLocaleString()} 件</span>
          </div>
        )}
      </div>

      {/* Log table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : !data || data.logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ログなし</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_100px_120px_160px] gap-4 px-4 py-2 text-gray-500 text-xs font-medium bg-gray-800/50">
              <div>管理者 / 対象</div>
              <div>操作</div>
              <div>対象タイプ</div>
              <div>IPアドレス</div>
              <div>日時</div>
            </div>
            {data.logs.map((log) => (
              <div key={log.id}>
                <div
                  className="grid grid-cols-[1fr_120px_100px_120px_160px] gap-4 px-4 py-3 hover:bg-gray-800/40 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div>
                    <div className="text-gray-200 text-sm font-medium">{log.adminUser.name ?? log.adminUser.email}</div>
                    <div className="text-gray-500 text-xs truncate">ID: {log.targetId}</div>
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${badgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">{log.targetType}</div>
                  <div className="text-gray-500 text-xs">{log.ipAddress ?? '—'}</div>
                  <div className="text-gray-500 text-xs">{formatDate(log.createdAt)}</div>
                </div>
                {expandedId === log.id && (
                  <div className="px-4 pb-4 bg-gray-800/20">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-2 font-medium">詳細データ</div>
                      <pre className="text-gray-300 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 rounded-lg text-sm transition-colors"
          >
            ← 前へ
          </button>
          <span className="text-gray-400 text-sm">{page} / {data.totalPages}</span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 rounded-lg text-sm transition-colors"
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}
