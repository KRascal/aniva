'use client';

import { useEffect, useState, useCallback } from 'react';
import type { QuoteData, ToastFn } from './types';
import { Skeleton } from './shared';

export function BibleQuotesTab({ characterId, onToast }: { characterId: string; onToast: ToastFn }) {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    quote: '',
    context: '',
    emotion: '',
    episode: '',
    category: 'general',
    importance: 5,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/quotes`);
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch { /* empty */ }
    setLoading(false);
  }, [characterId]);

  useEffect(() => { load(); }, [load]);

  const categories = Array.from(new Set(quotes.map((q) => q.category))).sort();
  const filtered = filter ? quotes.filter((q) => q.category === filter) : quotes;

  const handleAdd = async () => {
    if (!draft.quote.trim()) return;
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: draft.quote,
          context: draft.context || null,
          emotion: draft.emotion || null,
          episode: draft.episode || null,
          category: draft.category,
          importance: draft.importance,
        }),
      });
      if (res.ok) {
        onToast('セリフを追加しました', 'success');
        setDraft({ quote: '', context: '', emotion: '', episode: '', category: 'general', importance: 5 });
        setShowAdd(false);
        load();
      } else {
        onToast('追加に失敗しました', 'error');
      }
    } catch {
      onToast('追加に失敗しました', 'error');
    }
  };

  const handleDelete = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/quotes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
      if (res.ok) {
        onToast('セリフを削除しました', 'success');
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      } else {
        onToast('削除に失敗しました', 'error');
      }
    } catch {
      onToast('削除に失敗しました', 'error');
    }
  };

  if (loading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{filtered.length} / {quotes.length} 件</span>
          {categories.length > 0 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:border-purple-500/60"
            >
              <option value="">全カテゴリ</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showAdd ? 'キャンセル' : '追加'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-3">
          <div>
            <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">セリフ *</label>
            <textarea
              value={draft.quote}
              onChange={(e) => setDraft((p) => ({ ...p, quote: e.target.value }))}
              rows={2}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 resize-none"
              placeholder="原作のセリフを入力..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Context</label>
              <input
                type="text"
                value={draft.context}
                onChange={(e) => setDraft((p) => ({ ...p, context: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="どんな場面で..."
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Emotion</label>
              <input
                type="text"
                value={draft.emotion}
                onChange={(e) => setDraft((p) => ({ ...p, emotion: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="感情"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Episode</label>
              <input
                type="text"
                value={draft.episode}
                onChange={(e) => setDraft((p) => ({ ...p, episode: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="エピソード名"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Category</label>
              <input
                type="text"
                value={draft.category}
                onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
                placeholder="general"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Importance (1-10)</label>
              <input
                type="number"
                value={draft.importance}
                onChange={(e) => setDraft((p) => ({ ...p, importance: parseInt(e.target.value) || 5 }))}
                min={1}
                max={10}
                className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={handleAdd}
              disabled={!draft.quote.trim()}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* Quotes table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          セリフが登録されていません
        </div>
      ) : (
        <div className="bg-gray-900/60 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/40">
                <th className="text-left text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3">セリフ</th>
                <th className="text-left text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3 hidden md:table-cell">Context</th>
                <th className="text-left text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Emotion</th>
                <th className="text-left text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Episode</th>
                <th className="text-left text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-center text-gray-500 text-xs font-medium uppercase tracking-wider px-4 py-3 w-16">Imp.</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3 text-white text-sm max-w-xs">
                    <span className="line-clamp-2">{q.quote}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm hidden md:table-cell max-w-[140px] truncate">{q.context || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm hidden lg:table-cell">{q.emotion || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm hidden lg:table-cell truncate max-w-[120px]">{q.episode || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{q.category}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${q.importance >= 8 ? 'text-yellow-400' : q.importance >= 5 ? 'text-gray-300' : 'text-gray-500'}`}>
                      {q.importance}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
