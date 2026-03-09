'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────

interface SoulData {
  coreIdentity: string;
  motivation: string;
  worldview: string;
  timelinePosition: string | null;
  backstory: string | null;
  relationshipMap: Record<string, unknown>;
  personalityAxes: Record<string, unknown>;
  emotionalPatterns: Record<string, unknown>;
}

interface QuoteData {
  id: string;
  quote: string;
  context: string | null;
  emotion: string | null;
  episode: string | null;
  category: string;
  importance: number;
}

interface BoundaryData {
  id: string;
  rule: string;
  category: string;
  severity: string;
  example: string | null;
  reason: string | null;
}

interface VoiceData {
  firstPerson: string;
  secondPerson: string;
  sentenceEndings: string[];
  exclamations: string[];
  laughStyle: string | null;
  angryStyle: string | null;
  sadStyle: string | null;
  toneNotes: string | null;
  speechExamples: { user: string; char: string }[];
}

interface CharacterMeta {
  id: string;
  name: string;
  slug: string;
}

type TabKey = 'soul' | 'quotes' | 'boundaries' | 'voice';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'soul', label: 'Soul' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'boundaries', label: 'Boundaries' },
  { key: 'voice', label: 'Voice' },
];

// ─── Toast ───────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div
        className={`px-5 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-sm ${
          type === 'success'
            ? 'bg-green-500/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}
      >
        {message}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-gray-800 rounded" />
          <div className="h-10 bg-gray-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function jsonStringify(val: unknown): string {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return '{}';
  }
}

function jsonParse(val: string): Record<string, unknown> {
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

// ─── Soul Tab ────────────────────────────────────────────

function SoulTab({ characterId, onToast }: { characterId: string; onToast: (msg: string, type: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soul, setSoul] = useState<SoulData>({
    coreIdentity: '',
    motivation: '',
    worldview: '',
    timelinePosition: null,
    backstory: null,
    relationshipMap: {},
    personalityAxes: {},
    emotionalPatterns: {},
  });
  const [relationshipMapStr, setRelationshipMapStr] = useState('{}');
  const [personalityAxesStr, setPersonalityAxesStr] = useState('{}');
  const [emotionalPatternsStr, setEmotionalPatternsStr] = useState('{}');

  useEffect(() => {
    fetch(`/api/admin/characters/${characterId}/soul`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSoul({
            coreIdentity: data.coreIdentity || '',
            motivation: data.motivation || '',
            worldview: data.worldview || '',
            timelinePosition: data.timelinePosition || '',
            backstory: data.backstory || '',
            relationshipMap: data.relationshipMap || {},
            personalityAxes: data.personalityAxes || {},
            emotionalPatterns: data.emotionalPatterns || {},
          });
          setRelationshipMapStr(jsonStringify(data.relationshipMap || {}));
          setPersonalityAxesStr(jsonStringify(data.personalityAxes || {}));
          setEmotionalPatternsStr(jsonStringify(data.emotionalPatterns || {}));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...soul,
        relationshipMap: jsonParse(relationshipMapStr),
        personalityAxes: jsonParse(personalityAxesStr),
        emotionalPatterns: jsonParse(emotionalPatternsStr),
      };
      const res = await fetch(`/api/admin/characters/${characterId}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onToast('Soul を保存しました', 'success');
      } else {
        onToast('保存に失敗しました', 'error');
      }
    } catch {
      onToast('保存に失敗しました', 'error');
    }
    setSaving(false);
  };

  if (loading) return <Skeleton rows={6} />;

  const textFields: { key: keyof SoulData; label: string; rows: number }[] = [
    { key: 'coreIdentity', label: 'Core Identity', rows: 3 },
    { key: 'motivation', label: 'Motivation', rows: 2 },
    { key: 'worldview', label: 'Worldview', rows: 2 },
    { key: 'timelinePosition', label: 'Timeline Position', rows: 1 },
    { key: 'backstory', label: 'Backstory', rows: 4 },
  ];

  const jsonFields: { value: string; setter: (v: string) => void; label: string }[] = [
    { value: relationshipMapStr, setter: setRelationshipMapStr, label: 'Relationship Map' },
    { value: personalityAxesStr, setter: setPersonalityAxesStr, label: 'Personality Axes' },
    { value: emotionalPatternsStr, setter: setEmotionalPatternsStr, label: 'Emotional Patterns' },
  ];

  return (
    <div className="space-y-6">
      {textFields.map((f) => (
        <div key={f.key}>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">
            {f.label}
          </label>
          {f.rows > 1 ? (
            <textarea
              value={(soul[f.key] as string) || ''}
              onChange={(e) => setSoul((prev) => ({ ...prev, [f.key]: e.target.value }))}
              rows={f.rows}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
            />
          ) : (
            <input
              type="text"
              value={(soul[f.key] as string) || ''}
              onChange={(e) => setSoul((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          )}
        </div>
      ))}

      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-gray-300 text-sm font-semibold mb-4">JSON Data</h3>
        <div className="space-y-4">
          {jsonFields.map((f) => {
            let isValid = true;
            try { JSON.parse(f.value); } catch { isValid = false; }
            return (
              <div key={f.label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">{f.label}</label>
                  {!isValid && <span className="text-red-400 text-xs">Invalid JSON</span>}
                </div>
                <textarea
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  rows={5}
                  className={`w-full bg-gray-900 border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none transition-colors resize-none ${
                    isValid ? 'border-gray-800 focus:border-purple-500/60' : 'border-red-700/60 focus:border-red-500/60'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

// ─── Quotes Tab ──────────────────────────────────────────

function QuotesTab({ characterId, onToast }: { characterId: string; onToast: (msg: string, type: 'success' | 'error') => void }) {
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

// ─── Boundaries Tab ──────────────────────────────────────

function BoundariesTab({ characterId, onToast }: { characterId: string; onToast: (msg: string, type: 'success' | 'error') => void }) {
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

// ─── Voice Tab ───────────────────────────────────────────

function VoiceTab({ characterId, onToast }: { characterId: string; onToast: (msg: string, type: 'success' | 'error') => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voice, setVoice] = useState<VoiceData>({
    firstPerson: '',
    secondPerson: '',
    sentenceEndings: [],
    exclamations: [],
    laughStyle: null,
    angryStyle: null,
    sadStyle: null,
    toneNotes: null,
    speechExamples: [],
  });
  const [endingsStr, setEndingsStr] = useState('');
  const [exclStr, setExclStr] = useState('');
  const [newExample, setNewExample] = useState({ user: '', char: '' });

  useEffect(() => {
    fetch(`/api/admin/characters/${characterId}/voice`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setVoice({
            firstPerson: data.firstPerson || '',
            secondPerson: data.secondPerson || '',
            sentenceEndings: data.sentenceEndings || [],
            exclamations: data.exclamations || [],
            laughStyle: data.laughStyle || '',
            angryStyle: data.angryStyle || '',
            sadStyle: data.sadStyle || '',
            toneNotes: data.toneNotes || '',
            speechExamples: data.speechExamples || [],
          });
          setEndingsStr((data.sentenceEndings || []).join(', '));
          setExclStr((data.exclamations || []).join(', '));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...voice,
        sentenceEndings: endingsStr.split(',').map((s) => s.trim()).filter(Boolean),
        exclamations: exclStr.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/admin/characters/${characterId}/voice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onToast('Voice を保存しました', 'success');
      } else {
        onToast('保存に失敗しました', 'error');
      }
    } catch {
      onToast('保存に失敗しました', 'error');
    }
    setSaving(false);
  };

  const addExample = () => {
    if (!newExample.user.trim() || !newExample.char.trim()) return;
    setVoice((prev) => ({
      ...prev,
      speechExamples: [...prev.speechExamples, { user: newExample.user, char: newExample.char }],
    }));
    setNewExample({ user: '', char: '' });
  };

  const removeExample = (idx: number) => {
    setVoice((prev) => ({
      ...prev,
      speechExamples: prev.speechExamples.filter((_, i) => i !== idx),
    }));
  };

  if (loading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">一人称</label>
          <input
            type="text"
            value={voice.firstPerson}
            onChange={(e) => setVoice((p) => ({ ...p, firstPerson: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="俺 / 僕 / 私 ..."
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">二人称</label>
          <input
            type="text"
            value={voice.secondPerson}
            onChange={(e) => setVoice((p) => ({ ...p, secondPerson: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="お前 / あなた / 君 ..."
          />
        </div>
      </div>

      {/* Tag inputs */}
      <div>
        <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">語尾パターン（カンマ区切り）</label>
        <input
          type="text"
          value={endingsStr}
          onChange={(e) => setEndingsStr(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          placeholder="だぜ, だろ, じゃん ..."
        />
        {endingsStr && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {endingsStr.split(',').map((s) => s.trim()).filter(Boolean).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-900/40 text-purple-300 text-xs rounded-full border border-purple-800/40">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">感嘆表現（カンマ区切り）</label>
        <input
          type="text"
          value={exclStr}
          onChange={(e) => setExclStr(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          placeholder="おお！, やべぇ！, すげぇ！ ..."
        />
        {exclStr && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {exclStr.split(',').map((s) => s.trim()).filter(Boolean).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-xs rounded-full border border-blue-800/40">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Style fields */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">笑い方</label>
          <input
            type="text"
            value={voice.laughStyle || ''}
            onChange={(e) => setVoice((p) => ({ ...p, laughStyle: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="ししし"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">怒り方</label>
          <input
            type="text"
            value={voice.angryStyle || ''}
            onChange={(e) => setVoice((p) => ({ ...p, angryStyle: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="てめぇ！"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">悲しみ方</label>
          <input
            type="text"
            value={voice.sadStyle || ''}
            onChange={(e) => setVoice((p) => ({ ...p, sadStyle: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="..."
          />
        </div>
      </div>

      {/* Tone notes */}
      <div>
        <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">口調メモ</label>
        <textarea
          value={voice.toneNotes || ''}
          onChange={(e) => setVoice((p) => ({ ...p, toneNotes: e.target.value }))}
          rows={3}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
          placeholder="口調に関する追加メモ..."
        />
      </div>

      {/* Speech examples */}
      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-gray-300 text-sm font-semibold mb-4">会話サンプル</h3>
        {voice.speechExamples.length > 0 && (
          <div className="space-y-2 mb-4">
            {voice.speechExamples.map((ex, i) => (
              <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 group">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-xs shrink-0 mt-0.5 w-12">User:</span>
                      <span className="text-gray-300 text-sm">{ex.user}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 text-xs shrink-0 mt-0.5 w-12">Char:</span>
                      <span className="text-white text-sm">{ex.char}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeExample(i)}
                    className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 shrink-0"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-2">
          <div>
            <label className="block text-gray-500 text-xs mb-1">User</label>
            <input
              type="text"
              value={newExample.user}
              onChange={(e) => setNewExample((p) => ({ ...p, user: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
              placeholder="ユーザーの発言"
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Character</label>
            <input
              type="text"
              value={newExample.char}
              onChange={(e) => setNewExample((p) => ({ ...p, char: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
              placeholder="キャラの応答"
              onKeyDown={(e) => e.key === 'Enter' && addExample()}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={addExample}
              disabled={!newExample.user.trim() || !newExample.char.trim()}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
            >
              + 追加
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function BiblePage() {
  const params = useParams();
  const characterId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>('soul');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [charMeta, setCharMeta] = useState<CharacterMeta | null>(null);

  useEffect(() => {
    fetch('/api/admin/characters')
      .then((r) => r.json())
      .then((chars: CharacterMeta[]) => {
        const found = chars.find((c) => c.id === characterId);
        if (found) setCharMeta(found);
      })
      .catch(() => {});
  }, [characterId]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/characters"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </a>
          <div>
            <h1 className="text-xl font-bold text-white">
              {charMeta ? `${charMeta.name} — Bible` : 'Character Bible'}
            </h1>
            {charMeta && (
              <p className="text-gray-500 text-xs mt-0.5">{charMeta.slug}</p>
            )}
          </div>
        </div>
        <a
          href={`/admin/characters/${characterId}/test-chat`}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-purple-400 hover:text-purple-300 rounded-xl text-sm font-medium transition-colors"
        >
          🧪 テストチャット
        </a>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-12">
        {activeTab === 'soul' && <SoulTab characterId={characterId} onToast={showToast} />}
        {activeTab === 'quotes' && <QuotesTab characterId={characterId} onToast={showToast} />}
        {activeTab === 'boundaries' && <BoundariesTab characterId={characterId} onToast={showToast} />}
        {activeTab === 'voice' && <VoiceTab characterId={characterId} onToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
