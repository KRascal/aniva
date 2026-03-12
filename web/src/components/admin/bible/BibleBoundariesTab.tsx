'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BoundaryData, ToastFn } from './types';
import { Skeleton } from './shared';

export function BibleBoundariesTab({ characterId, onToast }: { characterId: string; onToast: ToastFn }) {
  const [loading, setLoading] = useState(true);
  const [boundaries, setBoundaries] = useState<BoundaryData[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    rule: '',
    category: 'speech',
    severity: 'hard',
    example: '',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/boundaries`);
      const data = await res.json();
      setBoundaries(Array.isArray(data) ? data : []);
    } catch { /* empty */ }
    setLoading(false);
  }, [characterId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!draft.rule.trim()) return;
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/boundaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule: draft.rule,
          category: draft.category,
          severity: draft.severity,
          example: draft.example || null,
          reason: draft.reason || null,
        }),
      });
      if (res.ok) {
        onToast('ルールを追加しました', 'success');
        setDraft({ rule: '', category: 'speech', severity: 'hard', example: '', reason: '' });
        setShowAdd(false);
        load();
      } else {
        onToast('追加に失敗しました', 'error');
      }
    } catch {
      onToast('追加に失敗しました', 'error');
    }
  };

  const handleDelete = async (boundaryId: string) => {
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/boundaries`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boundaryId }),
      });
      if (res.ok) {
        onToast('ルールを削除しました', 'success');
        setBoundaries((prev) => prev.filter((b) => b.id !== boundaryId));
      } else {
        onToast('削除に失敗しました', 'error');
      }
    } catch {
      onToast('削除に失敗しました', 'error');
    }
  };

  if (loading) return <Skeleton rows={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{boundaries.length} 件</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showAdd ? 'キャンセル' : '追加'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-3">
          <div>
            <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Rule *</label>
            <textarea
              value={draft.rule}
              onChange={(e) => setDraft((p) => ({ ...p, rule: e.target.value }))}
              rows={2}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 resize-none"
              placeholder="禁止ルールを入力..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Category</label>
              <input
                type="text"
                value={draft.category}
                onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="speech"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Severity</label>
              <select
                value={draft.severity}
                onChange={(e) => setDraft((p) => ({ ...p, severity: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
              >
                <option value="hard">Hard</option>
                <option value="soft">Soft</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Example</label>
              <input
                type="text"
                value={draft.example}
                onChange={(e) => setDraft((p) => ({ ...p, example: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="違反例"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Reason</label>
              <input
                type="text"
                value={draft.reason}
                onChange={(e) => setDraft((p) => ({ ...p, reason: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="理由"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!draft.rule.trim()}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {boundaries.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          禁止事項が登録されていません
        </div>
      ) : (
        <div className="space-y-2">
          {boundaries.map((b) => (
            <div
              key={b.id}
              className={`bg-gray-900/60 border rounded-xl p-4 flex items-start gap-3 group ${
                b.severity === 'hard'
                  ? 'border-red-900/40'
                  : 'border-yellow-900/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    b.severity === 'hard'
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-yellow-900/40 text-yellow-300'
                  }`}
                >
                  {b.severity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{b.rule}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>{b.category}</span>
                  {b.example && <span>例: {b.example}</span>}
                  {b.reason && <span>理由: {b.reason}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
