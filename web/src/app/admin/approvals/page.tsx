'use client';

import { useState, useEffect, useCallback } from 'react';

// ---- Types ----
interface AdminUserRef { id: string; name: string; email: string; }
interface CharacterRef { id: string; name: string; slug: string; avatarUrl?: string | null; }
interface ApprovalActionRow {
  id: string;
  action: string;
  comment: string | null;
  createdAt: string;
  actor: AdminUserRef;
}
interface ApprovalRow {
  id: string;
  characterId: string;
  character: CharacterRef;
  type: string;
  title: string;
  description: string | null;
  previousValue: unknown;
  proposedValue: unknown;
  diffSummary: string | null;
  status: string;
  priority: string;
  requester: AdminUserRef;
  actions: ApprovalActionRow[];
  createdAt: string;
}

const STATUS_TABS = [
  { value: 'pending', label: '承認待ち', icon: '🔴' },
  { value: 'approved', label: '承認済み', icon: '✅' },
  { value: 'rejected', label: '差し戻し', icon: '❌' },
  { value: '', label: '全件', icon: '📋' },
];

// コンテンツ公開タイプのみ抽出するフィルタ
const CONTENT_TYPES = [
  { value: '', label: 'すべてのタイプ' },
  { value: 'content_publish', label: '🎯 コンテンツ公開' },
  { value: 'prompt_change', label: '📝 プロンプト変更' },
  { value: 'personality_change', label: '🎭 人格設定変更' },
  { value: 'boundary_change', label: '🛡 バウンダリ変更' },
  { value: 'voice_change', label: '🎤 口調設定変更' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-300',
  high: 'text-orange-300',
  urgent: 'text-red-400 font-bold',
};

const TYPE_LABELS: Record<string, string> = {
  prompt_change: 'プロンプト変更',
  personality_change: '人格設定変更',
  boundary_change: 'バウンダリ変更',
  voice_change: '口調設定変更',
  content_publish: 'コンテンツ公開',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [activeTypeFilter, setActiveTypeFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (activeTypeFilter) params.set('type', activeTypeFilter);
      const url = `/api/admin/approvals?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      setApprovals(data.approvals ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [activeTab, activeTypeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selected = approvals.find(a => a.id === selectedId);

  async function handleAction(id: string, action: string) {
    setProcessing(true);
    try {
      // For now, use a placeholder actionBy - in production this would come from the session
      await fetch(`/api/admin/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          actionBy: approvals.find(a => a.id === id)?.requester?.id ?? 'system',
          comment: comment || null,
        }),
      });
      setComment('');
      fetchData();
    } catch (e) { console.error(e); }
    setProcessing(false);
  }

  function renderDiff(prev: unknown, proposed: unknown) {
    const prevStr = typeof prev === 'string' ? prev : JSON.stringify(prev, null, 2);
    const propStr = typeof proposed === 'string' ? proposed : JSON.stringify(proposed, null, 2);
    return (
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <p className="text-red-400 mb-1 font-sans text-xs">変更前</p>
          <pre className="bg-red-950/30 border border-red-900/30 rounded p-2 text-red-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {prevStr || '(なし)'}
          </pre>
        </div>
        <div>
          <p className="text-green-400 mb-1 font-sans text-xs">変更後</p>
          <pre className="bg-green-950/30 border border-green-900/30 rounded p-2 text-green-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {propStr}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">📋 監修・承認ダッシュボード</h1>

      {/* ステータスタブ */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = tab.value === activeTab ? approvals.length : undefined;
          return (
            <button key={tab.value} onClick={() => { setActiveTab(tab.value); setSelectedId(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {tab.icon} {tab.label} {count !== undefined ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* タイプフィルタ */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {CONTENT_TYPES.map(ct => (
          <button key={ct.value} onClick={() => { setActiveTypeFilter(ct.value); setSelectedId(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTypeFilter === ct.value ? 'bg-pink-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
            {ct.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* リスト */}
          <div className="space-y-3">
            {approvals.length === 0 && (
              <div className="text-gray-500 text-center py-12">リクエストがありません</div>
            )}
            {approvals.map(a => (
              <div key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedId === a.id ? 'bg-gray-800 border-purple-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs mr-2 ${PRIORITY_COLORS[a.priority] ?? 'text-gray-400'}`}>
                      {a.priority === 'urgent' ? '🔴' : a.priority === 'high' ? '🟡' : '⚪'} {a.priority.toUpperCase()}
                    </span>
                    <span className="text-white font-medium text-sm">{a.character?.name}: {a.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">{TYPE_LABELS[a.type] ?? a.type}</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  変更者: {a.requester?.email ?? '-'} | {new Date(a.createdAt).toLocaleString('ja-JP')}
                </div>
                {a.diffSummary && (
                  <div className="mt-1 text-xs text-gray-500 truncate">{a.diffSummary}</div>
                )}
              </div>
            ))}
          </div>

          {/* 詳細パネル */}
          {selected && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 sticky top-6">
              <h3 className="text-white font-bold mb-1">{selected.character?.name}: {selected.title}</h3>
              <p className="text-xs text-gray-400 mb-3">{TYPE_LABELS[selected.type] ?? selected.type} | {new Date(selected.createdAt).toLocaleString('ja-JP')}</p>

              {selected.description && (
                <p className="text-sm text-gray-300 mb-3">{selected.description}</p>
              )}

              {/* 差分表示 */}
              <div className="mb-4">
                {renderDiff(selected.previousValue, selected.proposedValue)}
              </div>

              {/* アクション履歴 */}
              {selected.actions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2 font-medium">アクション履歴</p>
                  <div className="space-y-2">
                    {selected.actions.map(act => (
                      <div key={act.id} className="text-xs bg-gray-800 rounded p-2">
                        <span className="text-gray-300">{act.actor?.name ?? '-'}</span>
                        <span className="text-gray-500 mx-1">—</span>
                        <span className={act.action === 'approved' ? 'text-green-400' : act.action === 'rejected' ? 'text-red-400' : 'text-gray-300'}>
                          {act.action}
                        </span>
                        {act.comment && <p className="text-gray-400 mt-1">{act.comment}</p>}
                        <span className="text-gray-600 ml-2">{new Date(act.createdAt).toLocaleString('ja-JP')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 承認・差し戻しUI */}
              {selected.status === 'pending' && (
                <div>
                  <textarea
                    value={comment} onChange={e => setComment(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
                    placeholder="コメント（任意）" rows={2} />
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(selected.id, 'approved')} disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      ✅ 承認
                    </button>
                    <button onClick={() => handleAction(selected.id, 'revision_requested')} disabled={processing}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      ✏️ 修正依頼
                    </button>
                    <button onClick={() => handleAction(selected.id, 'rejected')} disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      ❌ 差し戻し
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
