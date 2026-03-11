'use client';

import React, { useEffect, useState, useCallback } from 'react';

/* ─── Types ─── */
interface Character {
  id: string;
  name: string;
  slug: string;
}

interface GuardrailRule {
  id: string;
  characterId: string | null;
  character: { name: string; slug: string } | null;
  tenantId: string | null;
  ruleType: string;
  category: string;
  severity: string;
  pattern: string | null;
  description: string | null;
  ageRating: string | null;
  regions: string[];
  fallbackMessage: string | null;
  isActive: boolean;
  createdAt: string;
}

/* ─── Constants ─── */
const SCOPE_TABS = [
  { key: 'all', label: '全ルール' },
  { key: 'global', label: 'グローバル' },
  { key: 'character', label: 'キャラ別' },
] as const;

const CATEGORIES = [
  { key: 'sexual', label: '性的', icon: '🔞' },
  { key: 'violence', label: '暴力', icon: '⚔️' },
  { key: 'political', label: '政治', icon: '🏛' },
  { key: 'religious', label: '宗教', icon: '🛐' },
  { key: 'self_harm', label: '自傷', icon: '⚠' },
  { key: 'discrimination', label: '差別', icon: '🚫' },
  { key: 'spoiler', label: 'ネタバレ', icon: '📢' },
  { key: 'brand_damage', label: 'ブランド毀損', icon: '💔' },
];

const RULE_TYPES = [
  { key: 'ng_word', label: 'NGワード' },
  { key: 'ng_theme', label: 'NGテーマ' },
  { key: 'age_rating', label: '年齢レーティング' },
  { key: 'region_restrict', label: '地域制限' },
  { key: 'escalation', label: 'エスカレーション' },
];

const SEVERITIES = [
  { key: 'block', label: 'ブロック', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { key: 'warn', label: '警告', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { key: 'log', label: 'ログ', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { key: 'escalate', label: 'エスカレーション', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
];

const AGE_RATINGS = ['all_ages', '12+', '15+', '18+'];
const REGIONS = ['JP', 'US', 'EU', 'CN', 'KR', 'TW', 'SEA', 'GLOBAL'];

const SEVERITY_BADGE: Record<string, string> = Object.fromEntries(SEVERITIES.map((s) => [s.key, s.badge]));
const SEVERITY_LABEL: Record<string, string> = Object.fromEntries(SEVERITIES.map((s) => [s.key, s.label]));
const CATEGORY_MAP: Record<string, { label: string; icon: string }> = Object.fromEntries(CATEGORIES.map((c) => [c.key, { label: c.label, icon: c.icon }]));
const RULE_TYPE_LABEL: Record<string, string> = Object.fromEntries(RULE_TYPES.map((r) => [r.key, r.label]));

const EMPTY_FORM = {
  characterId: '',
  ruleType: 'ng_word',
  category: 'sexual',
  severity: 'block',
  pattern: '',
  description: '',
  ageRating: '',
  regions: [] as string[],
  fallbackMessage: '',
};

type FormState = typeof EMPTY_FORM;

/* ─── Component ─── */
export default function GuardrailsPage() {
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeTab, setScopeTab] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        fetch('/api/admin/guardrails'),
        fetch('/api/admin/characters'),
      ]);
      const gData = await gRes.json();
      const cData = await cRes.json();
      setRules(Array.isArray(gData) ? gData : []);
      setCharacters(Array.isArray(cData) ? cData : []);
    } catch {
      setError('データの読み込みに失敗しました');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filters ── */
  const filtered = rules.filter((r) => {
    if (scopeTab === 'global' && r.characterId !== null) return false;
    if (scopeTab === 'character' && r.characterId === null) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    return true;
  });

  /* ── Form ── */
  const f = (key: keyof FormState, val: FormState[keyof FormState]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleRegion = (region: string) => {
    setForm((prev) => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter((r) => r !== region)
        : [...prev.regions, region],
    }));
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (rule: GuardrailRule) => {
    setForm({
      characterId: rule.characterId ?? '',
      ruleType: rule.ruleType,
      category: rule.category,
      severity: rule.severity,
      pattern: rule.pattern ?? '',
      description: rule.description ?? '',
      ageRating: rule.ageRating ?? '',
      regions: rule.regions,
      fallbackMessage: rule.fallbackMessage ?? '',
    });
    setEditingId(rule.id);
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.ruleType || !form.category) {
      setError('ルールタイプとカテゴリは必須です');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        characterId: form.characterId || null,
        ruleType: form.ruleType,
        category: form.category,
        severity: form.severity,
        pattern: form.pattern || null,
        description: form.description || null,
        ageRating: form.ageRating || null,
        regions: form.regions,
        fallbackMessage: form.fallbackMessage || null,
      };

      const url = editingId ? `/api/admin/guardrails/${editingId}` : '/api/admin/guardrails';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存に失敗しました');
      }
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    }
    setSaving(false);
  };

  const deactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/guardrails/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('無効化に失敗しました');
      load();
    } catch {
      setError('無効化に失敗しました');
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ガードレール管理</h1>
          <p className="text-gray-400 text-sm mt-1">コンテンツ安全ルールの設定・管理</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + 新規ルール
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>
      )}

      {/* Scope Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {SCOPE_TABS.map((tab) => {
          const count = tab.key === 'all'
            ? rules.length
            : tab.key === 'global'
              ? rules.filter((r) => !r.characterId).length
              : rules.filter((r) => r.characterId).length;
          return (
            <button
              key={tab.key}
              onClick={() => setScopeTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                ${scopeTab === tab.key ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${scopeTab === tab.key ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !categoryFilter ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
          }`}
        >
          全カテゴリ
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(categoryFilter === cat.key ? '' : cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
              categoryFilter === cat.key
                ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">パターン</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">カテゴリ</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">タイプ</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">重要度</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">対象</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                    ルールがありません
                  </td>
                </tr>
              ) : (
                filtered.map((rule) => {
                  const cat = CATEGORY_MAP[rule.category];
                  return (
                    <tr key={rule.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        {rule.pattern ? (
                          <code className="text-white text-sm font-mono bg-gray-800 px-2 py-0.5 rounded">{rule.pattern}</code>
                        ) : (
                          <span className="text-gray-500 text-sm italic">パターンなし</span>
                        )}
                        {rule.description && (
                          <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{rule.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <span>{cat?.icon ?? '•'}</span>
                          <span>{cat?.label ?? rule.category}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">{RULE_TYPE_LABEL[rule.ruleType] ?? rule.ruleType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_BADGE[rule.severity] ?? SEVERITY_BADGE.block}`}>
                          {SEVERITY_LABEL[rule.severity] ?? rule.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-sm">
                          {rule.character ? rule.character.name : 'グローバル'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(rule)}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deactivate(rule.id)}
                            className="text-gray-400 hover:text-red-400 text-sm transition-colors"
                          >
                            無効化
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Log Placeholder */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 px-6 py-8 text-center">
        <div className="text-gray-600 text-sm">ガードレール発動ログは準備中です</div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">{editingId ? 'ルール編集' : '新規ルール作成'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors text-xl">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">ルールタイプ *</label>
                  <select
                    value={form.ruleType}
                    onChange={(e) => f('ruleType', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    {RULE_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">カテゴリ *</label>
                  <select
                    value={form.category}
                    onChange={(e) => f('category', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">重要度</label>
                <div className="flex gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => f('severity', s.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.severity === s.key ? s.badge : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">パターン</label>
                <input
                  value={form.pattern}
                  onChange={(e) => f('pattern', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                  placeholder="NGワード/パターン"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => f('description', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">年齢レーティング</label>
                  <select
                    value={form.ageRating}
                    onChange={(e) => f('ageRating', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">指定なし</option>
                    {AGE_RATINGS.map((a) => (
                      <option key={a} value={a}>{a === 'all_ages' ? '全年齢' : a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">対象キャラ（空=グローバル）</label>
                  <select
                    value={form.characterId}
                    onChange={(e) => f('characterId', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">グローバル</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">適用地域</label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRegion(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.regions.includes(r)
                          ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">フェイルセーフメッセージ</label>
                <input
                  value={form.fallbackMessage}
                  onChange={(e) => f('fallbackMessage', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="ブロック時にユーザーに表示するメッセージ"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                キャンセル
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? '保存中...' : editingId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
