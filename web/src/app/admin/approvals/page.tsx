'use client';

import React, { useEffect, useState, useCallback } from 'react';

/* ─── Types ─── */
interface Character {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
}

interface Actor {
  email: string;
  name: string | null;
}

interface ApprovalAction {
  id: string;
  action: string;
  comment: string | null;
  actor: Actor;
  createdAt: string;
}

interface ApprovalRequest {
  id: string;
  characterId: string;
  character: Character;
  type: string;
  title: string;
  description: string | null;
  previousValue: unknown;
  proposedValue: unknown;
  diffSummary: string | null;
  status: string;
  priority: string;
  requester: { email: string; name: string | null };
  actions: ApprovalAction[];
  createdAt: string;
}

/* ─── Constants ─── */
const STATUS_TABS = [
  { key: 'pending', label: '承認待ち' },
  { key: 'approved', label: '承認済み' },
  { key: 'rejected', label: '差し戻し' },
  { key: 'all', label: '全件' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  revision_requested: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '差し戻し',
  revision_requested: '修正依頼',
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: '緊急',
  high: '高',
  normal: '通常',
  low: '低',
};

const REQUEST_TYPES = [
  'prompt_change',
  'character_update',
  'content_change',
  'voice_change',
  'other',
];

const TYPE_LABEL: Record<string, string> = {
  prompt_change: 'プロンプト変更',
  character_update: 'キャラ更新',
  content_change: 'コンテンツ変更',
  voice_change: '音声変更',
  other: 'その他',
};

/* ─── Component ─── */
export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Create request
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    characterId: '',
    type: 'prompt_change',
    title: '',
    description: '',
    previousValue: '',
    proposedValue: '',
    diffSummary: '',
    priority: 'normal',
  });
  const [creating, setCreating] = useState(false);

  // Emergency stop
  const [emergencyCharId, setEmergencyCharId] = useState('');
  const [emergencyConfirm, setEmergencyConfirm] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch('/api/admin/approvals'),
        fetch('/api/admin/characters'),
      ]);
      const aData = await aRes.json();
      const cData = await cRes.json();
      setRequests(Array.isArray(aData) ? aData : []);
      setCharacters(Array.isArray(cData) ? cData : []);
    } catch {
      setError('データの読み込みに失敗しました');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filters ── */
  const filtered = activeTab === 'all'
    ? requests
    : requests.filter((r) => r.status === activeTab);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  /* ── Actions ── */
  const performAction = async (requestId: string, action: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/admin/approvals/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: actionComment || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '操作に失敗しました');
      }
      setActionComment('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作に失敗しました');
    }
    setActionLoading(null);
  };

  const createRequest = async () => {
    if (!createForm.characterId || !createForm.title || !createForm.proposedValue) {
      setError('キャラ、タイトル、提案値は必須です');
      return;
    }
    setCreating(true);
    setError('');
    try {
      let previousParsed: unknown = null;
      let proposedParsed: unknown;
      try { previousParsed = createForm.previousValue ? JSON.parse(createForm.previousValue) : null; } catch { previousParsed = createForm.previousValue; }
      try { proposedParsed = JSON.parse(createForm.proposedValue); } catch { proposedParsed = createForm.proposedValue; }

      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: createForm.characterId,
          type: createForm.type,
          title: createForm.title,
          description: createForm.description || null,
          previousValue: previousParsed,
          proposedValue: proposedParsed,
          diffSummary: createForm.diffSummary || null,
          priority: createForm.priority,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '作成に失敗しました');
      }
      setShowCreate(false);
      setCreateForm({ characterId: '', type: 'prompt_change', title: '', description: '', previousValue: '', proposedValue: '', diffSummary: '', priority: 'normal' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    }
    setCreating(false);
  };

  const emergencyStop = async () => {
    if (!emergencyCharId) return;
    setEmergencyLoading(true);
    try {
      const res = await fetch('/api/admin/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: emergencyCharId }),
      });
      if (!res.ok) throw new Error('緊急停止に失敗しました');
      setEmergencyConfirm(false);
      setEmergencyCharId('');
      setError('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '緊急停止に失敗しました');
    }
    setEmergencyLoading(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
  };

  const renderDiff = (prev: unknown, proposed: unknown) => {
    const prevStr = typeof prev === 'string' ? prev : JSON.stringify(prev, null, 2);
    const propStr = typeof proposed === 'string' ? proposed : JSON.stringify(proposed, null, 2);
    if (!prev) {
      return (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <div className="text-green-400 text-xs font-medium mb-1">新規値</div>
          <pre className="text-green-300 text-xs whitespace-pre-wrap font-mono">{propStr}</pre>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="text-red-400 text-xs font-medium mb-1">変更前</div>
          <pre className="text-red-300 text-xs whitespace-pre-wrap font-mono">{prevStr}</pre>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <div className="text-green-400 text-xs font-medium mb-1">変更後</div>
          <pre className="text-green-300 text-xs whitespace-pre-wrap font-mono">{propStr}</pre>
        </div>
      </div>
    );
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Stop Bar */}
      <div className="bg-red-500/5 border border-red-500/30 rounded-xl px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg">🚨</span>
            <span className="text-red-400 font-bold text-sm">緊急停止</span>
          </div>
          <select
            value={emergencyCharId}
            onChange={(e) => setEmergencyCharId(e.target.value)}
            className="flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">キャラクターを選択</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => { if (emergencyCharId) setEmergencyConfirm(true); }}
            disabled={!emergencyCharId}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
          >
            緊急停止を実行
          </button>
        </div>
      </div>

      {/* Emergency Confirm Dialog */}
      {emergencyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEmergencyConfirm(false)}>
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">🚨</div>
              <h3 className="text-white font-bold text-lg mb-2">本当に緊急停止しますか？</h3>
              <p className="text-gray-400 text-sm mb-1">選択されたキャラクターが即座にオフラインになります。</p>
              <p className="text-red-400 text-xs mb-4">この操作はユーザーに影響を与えます。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEmergencyConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={emergencyStop}
                disabled={emergencyLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
              >
                {emergencyLoading ? '停止中...' : '停止する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">監修・承認ワークフロー</h1>
          <p className="text-gray-400 text-sm mt-1">コンテンツ変更の承認管理</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + 新規リクエスト
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === 'all' ? requests.length : requests.filter((r) => r.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                ${activeTab === tab.key ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab.key === 'pending' && count > 0
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : activeTab === tab.key ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 px-6 py-12 text-center text-gray-500 text-sm">
            リクエストがありません
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {/* Summary Row */}
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm truncate">{r.title}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${PRIORITY_BADGE[r.priority] ?? PRIORITY_BADGE.normal}`}>
                      {PRIORITY_LABEL[r.priority] ?? r.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{r.character.name}</span>
                    <span>{TYPE_LABEL[r.type] ?? r.type}</span>
                    <span>{r.requester.name ?? r.requester.email}</span>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE[r.status] ?? STATUS_BADGE.pending}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span className={`text-gray-500 transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {/* Expanded Detail */}
              {expandedId === r.id && (
                <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                  {/* Description */}
                  {r.description && (
                    <div>
                      <div className="text-gray-500 text-xs mb-1">説明</div>
                      <div className="text-gray-300 text-sm">{r.description}</div>
                    </div>
                  )}

                  {/* Diff */}
                  <div>
                    <div className="text-gray-500 text-xs mb-2">変更内容</div>
                    {renderDiff(r.previousValue, r.proposedValue)}
                  </div>

                  {/* Diff Summary */}
                  {r.diffSummary && (
                    <div>
                      <div className="text-gray-500 text-xs mb-1">差分サマリー</div>
                      <div className="text-gray-300 text-sm bg-gray-800/50 rounded-lg px-3 py-2">{r.diffSummary}</div>
                    </div>
                  )}

                  {/* Action History */}
                  {r.actions.length > 0 && (
                    <div>
                      <div className="text-gray-500 text-xs mb-2">アクション履歴</div>
                      <div className="space-y-2">
                        {r.actions.map((a) => (
                          <div key={a.id} className="flex items-start gap-3 text-sm">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              a.action === 'approved' ? 'bg-green-400' :
                              a.action === 'rejected' ? 'bg-red-400' :
                              a.action === 'revision_requested' ? 'bg-orange-400' :
                              'bg-gray-400'
                            }`} />
                            <div>
                              <span className="text-gray-300">{a.actor.name ?? a.actor.email}</span>
                              <span className="text-gray-500 mx-1">が</span>
                              <span className="text-gray-300 font-medium">
                                {a.action === 'approved' ? '承認' :
                                 a.action === 'rejected' ? '差し戻し' :
                                 a.action === 'revision_requested' ? '修正依頼' :
                                 'コメント'}
                              </span>
                              <span className="text-gray-600 text-xs ml-2">{formatDate(a.createdAt)}</span>
                              {a.comment && <div className="text-gray-400 text-xs mt-0.5">{a.comment}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {r.status === 'pending' && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-gray-500 text-xs mb-1">コメント</label>
                          <input
                            value={actionComment}
                            onChange={(e) => setActionComment(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder="承認/差し戻しの理由..."
                          />
                        </div>
                        <button
                          onClick={() => performAction(r.id, 'approved')}
                          disabled={actionLoading === r.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => performAction(r.id, 'revision_requested')}
                          disabled={actionLoading === r.id}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          差し戻し
                        </button>
                        <button
                          onClick={() => performAction(r.id, 'comment')}
                          disabled={actionLoading === r.id || !actionComment}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          コメント
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Audit Log Placeholder */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 px-6 py-8 text-center">
        <div className="text-gray-600 text-sm">監査ログ — Phase4で実装予定</div>
      </div>

      {/* Create Request Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setShowCreate(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">承認リクエスト作成</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white transition-colors text-xl">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">キャラクター *</label>
                  <select
                    value={createForm.characterId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, characterId: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">選択してください</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">タイプ</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    {REQUEST_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">タイトル *</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">説明</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">変更前の値（JSON可）</label>
                <textarea
                  value={createForm.previousValue}
                  onChange={(e) => setCreateForm((p) => ({ ...p, previousValue: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">提案値（JSON可） *</label>
                <textarea
                  value={createForm.proposedValue}
                  onChange={(e) => setCreateForm((p) => ({ ...p, proposedValue: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">差分サマリー</label>
                <input
                  value={createForm.diffSummary}
                  onChange={(e) => setCreateForm((p) => ({ ...p, diffSummary: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">優先度</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                キャンセル
              </button>
              <button
                onClick={createRequest}
                disabled={creating}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? '作成中...' : 'リクエスト作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
