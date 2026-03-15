'use client';

import { useCallback, useEffect, useState } from 'react';

interface Report {
  id: string;
  reporterId: string;
  reporter: {
    id: string;
    displayName: string | null;
    nickname: string | null;
    email: string | null;
  };
  targetType: string;
  targetId: string;
  reason: string;
  detail: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const TARGET_TYPES = ['', 'moment', 'comment', 'user', 'message'];
const STATUSES = ['', 'pending', 'reviewed', 'resolved', 'dismissed'];

const STATUS_LABEL: Record<string, string> = {
  pending: '未対応',
  reviewed: '確認済み',
  resolved: '対応完了',
  dismissed: '無視',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-700',
  reviewed: 'bg-blue-900/40 text-blue-400 border-blue-700',
  resolved: 'bg-green-900/40 text-green-400 border-green-700',
  dismissed: 'bg-neutral-800 text-neutral-400 border-neutral-700',
};

const REASON_LABEL: Record<string, string> = {
  spam: 'スパム',
  harassment: 'ハラスメント',
  inappropriate: '不適切',
  copyright: '著作権侵害',
  other: 'その他',
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  moment: 'モーメント',
  comment: 'コメント',
  user: 'ユーザー',
  message: 'メッセージ',
};

export default function ReportsManagementPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);

  const load = useCallback(async (p = 1, st = statusFilter, tt = targetTypeFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '50' });
    if (st) params.set('status', st);
    if (tt) params.set('targetType', tt);
    const res = await fetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    setReports(data.reports || []);
    setTotal(data.pagination?.total || 0);
    setTotalPages(data.pagination?.totalPages || 1);
    setLoading(false);
  }, [statusFilter, targetTypeFilter]);

  useEffect(() => { load(page); }, [page, statusFilter, targetTypeFilter, load]);

  const updateStatus = async (reportId: string, newStatus: string) => {
    setUpdating(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
        );
        if (selected?.id === reportId) {
          setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
        }
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">通報管理</h1>
          <p className="text-sm text-neutral-400 mt-1">合計 {total} 件</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? STATUS_LABEL[s] : '全ステータス'}</option>
          ))}
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
          className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {TARGET_TYPES.map((t) => (
            <option key={t} value={t}>{t ? TARGET_TYPE_LABEL[t] ?? t : '全タイプ'}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* 一覧 */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">通報がありません</div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`bg-neutral-900 border rounded-lg p-4 cursor-pointer transition-colors hover:border-neutral-600 ${
                    selected?.id === r.id ? 'border-blue-600' : 'border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${STATUS_COLOR[r.status] || ''}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                        <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
                          {TARGET_TYPE_LABEL[r.targetType] ?? r.targetType}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300 truncate">
                        通報者: {r.reporter.displayName || r.reporter.nickname || r.reporter.email || r.reporterId}
                      </p>
                      {r.detail && (
                        <p className="text-xs text-neutral-500 mt-1 truncate">{r.detail}</p>
                      )}
                    </div>
                    <div className="text-xs text-neutral-600 shrink-0">
                      {new Date(r.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {r.status !== 'reviewed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'reviewed'); }}
                        disabled={updating === r.id}
                        className="px-3 py-1 text-xs bg-blue-800 hover:bg-blue-700 text-blue-200 rounded transition-colors disabled:opacity-50"
                      >
                        確認済み
                      </button>
                    )}
                    {r.status !== 'resolved' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'resolved'); }}
                        disabled={updating === r.id}
                        className="px-3 py-1 text-xs bg-green-800 hover:bg-green-700 text-green-200 rounded transition-colors disabled:opacity-50"
                      >
                        対応完了
                      </button>
                    )}
                    {r.status !== 'dismissed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'dismissed'); }}
                        disabled={updating === r.id}
                        className="px-3 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded transition-colors disabled:opacity-50"
                      >
                        無視
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded disabled:opacity-40 transition-colors"
              >
                ←
              </button>
              <span className="text-sm text-neutral-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded disabled:opacity-40 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* 詳細パネル */}
        {selected && (
          <div className="w-80 shrink-0 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 sticky top-6 self-start">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">通報詳細</h3>
              <button onClick={() => setSelected(null)} className="text-neutral-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-neutral-500 text-xs mb-1">ID</p>
                <p className="text-neutral-300 font-mono text-xs break-all">{selected.id}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs mb-1">ステータス</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${STATUS_COLOR[selected.status] || ''}`}>
                  {STATUS_LABEL[selected.status] || selected.status}
                </span>
              </div>
              <div>
                <p className="text-neutral-500 text-xs mb-1">通報タイプ</p>
                <p className="text-neutral-300">{TARGET_TYPE_LABEL[selected.targetType] ?? selected.targetType}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs mb-1">対象ID</p>
                <p className="text-neutral-300 font-mono text-xs break-all">{selected.targetId}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs mb-1">理由</p>
                <p className="text-neutral-300">{REASON_LABEL[selected.reason] ?? selected.reason}</p>
              </div>
              {selected.detail && (
                <div>
                  <p className="text-neutral-500 text-xs mb-1">詳細コメント</p>
                  <p className="text-neutral-300 text-xs leading-relaxed bg-neutral-800 rounded p-2">{selected.detail}</p>
                </div>
              )}
              <div>
                <p className="text-neutral-500 text-xs mb-1">通報者</p>
                <p className="text-neutral-300 text-xs">
                  {selected.reporter.displayName || selected.reporter.nickname || selected.reporter.email || selected.reporterId}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs mb-1">通報日時</p>
                <p className="text-neutral-300 text-xs">{new Date(selected.createdAt).toLocaleString('ja-JP')}</p>
              </div>
              {selected.reviewedAt && (
                <div>
                  <p className="text-neutral-500 text-xs mb-1">対応日時</p>
                  <p className="text-neutral-300 text-xs">{new Date(selected.reviewedAt).toLocaleString('ja-JP')}</p>
                </div>
              )}
            </div>
            <div className="pt-2 space-y-2">
              {selected.status !== 'reviewed' && (
                <button
                  onClick={() => updateStatus(selected.id, 'reviewed')}
                  disabled={updating === selected.id}
                  className="w-full px-3 py-2 text-sm bg-blue-800 hover:bg-blue-700 text-blue-200 rounded transition-colors disabled:opacity-50"
                >
                  確認済みにする
                </button>
              )}
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => updateStatus(selected.id, 'resolved')}
                  disabled={updating === selected.id}
                  className="w-full px-3 py-2 text-sm bg-green-800 hover:bg-green-700 text-green-200 rounded transition-colors disabled:opacity-50"
                >
                  対応完了にする
                </button>
              )}
              {selected.status !== 'dismissed' && (
                <button
                  onClick={() => updateStatus(selected.id, 'dismissed')}
                  disabled={updating === selected.id}
                  className="w-full px-3 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded transition-colors disabled:opacity-50"
                >
                  無視する
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
