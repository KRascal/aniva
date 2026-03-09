'use client';

import { useCallback, useEffect, useState } from 'react';

interface FeedbackRow {
  id: string;
  userId: string;
  characterId: string;
  characterName: string;
  type: string;
  userComment: string | null;
  userMessage: string | null;
  aiResponse: string;
  status: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  out_of_character: 'キャラ崩壊',
  wrong_knowledge: '知識間違い',
  tone_mismatch: 'トーン不一致',
  other: 'その他',
};

const STATUS_OPTIONS = ['pending', 'reviewed', 'resolved'] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  reviewed: 'bg-blue-900/30 text-blue-400',
  resolved: 'bg-green-900/30 text-green-400',
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('type', filterType);
      const r = await fetch(`/api/admin/feedback?${params}`);
      const data = await r.json();
      setFeedbacks(data.feedbacks || []);
    } catch {
      setFeedbacks([]);
    }
    setLoading(false);
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    } catch { /* ignore */ }
    setUpdating(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">💬 フィードバック</h1>
        <p className="text-gray-400 text-sm mt-1">ユーザーからの違和感報告を管理</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">全ステータス</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'pending' ? '未対応' : s === 'reviewed' ? 'レビュー済' : '解決済'}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">全タイプ</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="text-gray-500 text-sm self-center">
          {feedbacks.length} 件
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">フィードバックがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">日時</th>
                  <th className="px-4 py-3 font-medium">キャラ名</th>
                  <th className="px-4 py-3 font-medium">タイプ</th>
                  <th className="px-4 py-3 font-medium">ユーザーコメント</th>
                  <th className="px-4 py-3 font-medium">AIレスポンス</th>
                  <th className="px-4 py-3 font-medium text-center">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map(fb => (
                  <tr
                    key={fb.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === fb.id ? null : fb.id)}
                  >
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(fb.createdAt)}</td>
                    <td className="px-4 py-3 text-white font-medium">{fb.characterName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                        {TYPE_LABELS[fb.type] || fb.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[200px]">
                      <div className={expandedId === fb.id ? '' : 'line-clamp-2'}>
                        {fb.userComment || <span className="text-gray-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[250px]">
                      <div className={expandedId === fb.id ? '' : 'line-clamp-2'}>
                        {fb.aiResponse}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <select
                          value={fb.status}
                          onChange={e => updateStatus(fb.id, e.target.value)}
                          disabled={updating === fb.id}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50 ${STATUS_STYLES[fb.status] || 'bg-gray-800 text-gray-300'}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                              {s === 'pending' ? '未対応' : s === 'reviewed' ? 'レビュー済' : '解決済'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
