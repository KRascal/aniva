'use client';

import { useState, useEffect, useCallback } from 'react';

// ---- Types ----
interface CharacterRef { id: string; name: string; slug: string; }
interface GuardrailRule {
  id: string;
  characterId: string | null;
  character: CharacterRef | null;
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

interface GuardrailLogRow {
  id: string;
  ruleId: string | null;
  characterId: string;
  userId: string;
  triggerText: string;
  action: string;
  resolved: boolean;
  createdAt: string;
}

interface FormState {
  characterId: string;
  ruleType: string;
  category: string;
  severity: string;
  pattern: string;
  description: string;
  fallbackMessage: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  characterId: '', ruleType: 'ng_word', category: 'violence',
  severity: 'block', pattern: '', description: '', fallbackMessage: '', isActive: true,
};

const CATEGORIES = [
  { value: 'sexual', label: '性的' },
  { value: 'violence', label: '暴力' },
  { value: 'political', label: '政治' },
  { value: 'religious', label: '宗教' },
  { value: 'self_harm', label: '自傷' },
  { value: 'discrimination', label: '差別' },
  { value: 'spoiler', label: 'ネタバレ' },
  { value: 'brand_damage', label: 'ブランド' },
];

const SEVERITY_OPTIONS = [
  { value: 'block', label: '即遮断', color: 'bg-red-900/50 text-red-300' },
  { value: 'warn', label: '警告', color: 'bg-yellow-800/50 text-yellow-300' },
  { value: 'log', label: '記録のみ', color: 'bg-gray-700 text-gray-300' },
  { value: 'escalate', label: 'エスカレーション', color: 'bg-purple-800/50 text-purple-300' },
];

const RULE_TYPES = [
  { value: 'ng_word', label: 'NGワード' },
  { value: 'ng_theme', label: 'NGテーマ' },
  { value: 'age_rating', label: '年齢制限' },
  { value: 'region_restrict', label: '地域制限' },
  { value: 'escalation', label: 'エスカレーション' },
];

type TabType = 'rules' | 'logs';

export default function GuardrailsPage() {
  const [tab, setTab] = useState<TabType>('rules');
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [logs, setLogs] = useState<GuardrailLogRow[]>([]);
  const [characters, setCharacters] = useState<CharacterRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterCategory ? `/api/admin/guardrails?category=${filterCategory}` : '/api/admin/guardrails';
      const [rRes, cRes] = await Promise.all([
        fetch(url),
        fetch('/api/admin/characters'),
      ]);
      const rData = await rRes.json();
      const cData = await cRes.json();
      setRules(rData.rules ?? []);
      setCharacters((cData.characters ?? []).map((c: { id: string; name: string; slug: string }) => ({ id: c.id, name: c.name, slug: c.slug })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filterCategory]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/guardrails/logs?limit=200');
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'rules') fetchRules();
    else fetchLogs();
  }, [tab, fetchRules, fetchLogs]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(r: GuardrailRule) {
    setEditId(r.id);
    setForm({
      characterId: r.characterId ?? '',
      ruleType: r.ruleType,
      category: r.category,
      severity: r.severity,
      pattern: r.pattern ?? '',
      description: r.description ?? '',
      fallbackMessage: r.fallbackMessage ?? '',
      isActive: r.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        characterId: form.characterId || null,
      };
      const url = editId ? `/api/admin/guardrails/${editId}` : '/api/admin/guardrails';
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setModalOpen(false);
      fetchRules();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('このルールを削除しますか？')) return;
    await fetch(`/api/admin/guardrails/${id}`, { method: 'DELETE' });
    fetchRules();
  }

  function severityBadge(severity: string) {
    const opt = SEVERITY_OPTIONS.find(o => o.value === severity);
    return <span className={`px-2 py-0.5 rounded text-xs ${opt?.color ?? 'bg-gray-700 text-gray-400'}`}>{opt?.label ?? severity}</span>;
  }

  function actionBadge(action: string) {
    const colors: Record<string, string> = {
      blocked: 'bg-red-900/50 text-red-300',
      warned: 'bg-yellow-800/50 text-yellow-300',
      escalated: 'bg-purple-800/50 text-purple-300',
      logged: 'bg-gray-700 text-gray-300',
    };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[action] ?? 'bg-gray-700 text-gray-400'}`}>{action}</span>;
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  // Stats for logs
  const logStats = {
    blocked: logs.filter(l => l.action === 'blocked').length,
    warned: logs.filter(l => l.action === 'warned').length,
    escalated: logs.filter(l => l.action === 'escalated').length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">🛡 ガードレール管理</h1>
        {tab === 'rules' && (
          <button onClick={openCreate} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            + 新規ルール追加
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'rules' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          ルール管理
        </button>
        <button onClick={() => setTab('logs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'logs' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          発動ログ
        </button>
      </div>

      {tab === 'rules' && (
        <>
          {/* カテゴリフィルタ */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setFilterCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterCategory ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              全カテゴリ
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === cat.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-gray-400 text-center py-12">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">パターン</th>
                    <th className="text-left px-4 py-3">種別</th>
                    <th className="text-left px-4 py-3">カテゴリ</th>
                    <th className="text-left px-4 py-3">重要度</th>
                    <th className="text-left px-4 py-3">対象キャラ</th>
                    <th className="text-center px-4 py-3">有効</th>
                    <th className="text-right px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white font-mono text-xs">{r.pattern || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{RULE_TYPES.find(rt => rt.value === r.ruleType)?.label ?? r.ruleType}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{CATEGORIES.find(c => c.value === r.category)?.label ?? r.category}</td>
                      <td className="px-4 py-3">{severityBadge(r.severity)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.character?.name ?? 'グローバル'}</td>
                      <td className="px-4 py-3 text-center">{r.isActive ? <span className="text-green-400">●</span> : <span className="text-gray-600">○</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(r)} className="text-purple-400 hover:text-purple-300 text-xs mr-3">編集</button>
                        <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-500">ルールがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <>
          {/* ログ統計 */}
          <div className="flex gap-4 mb-4">
            <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-2">
              <span className="text-red-300 text-sm font-medium">🔴 {logStats.blocked}件ブロック</span>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-4 py-2">
              <span className="text-yellow-300 text-sm font-medium">🟡 {logStats.warned}件警告</span>
            </div>
            <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg px-4 py-2">
              <span className="text-purple-300 text-sm font-medium">🟣 {logStats.escalated}件エスカレーション</span>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-400 text-center py-12">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">日時</th>
                    <th className="text-left px-4 py-3">アクション</th>
                    <th className="text-left px-4 py-3">トリガーテキスト</th>
                    <th className="text-left px-4 py-3">キャラID</th>
                    <th className="text-center px-4 py-3">解決済み</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleString('ja-JP')}</td>
                      <td className="px-4 py-3">{actionBadge(l.action)}</td>
                      <td className="px-4 py-3 text-white text-xs max-w-xs truncate">{l.triggerText}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{l.characterId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-center">{l.resolved ? <span className="text-green-400">✓</span> : <span className="text-gray-600">-</span>}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">ログがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalOpen(false)}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{editId ? 'ルール編集' : '新規ルール追加'}</h2>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>対象キャラ（空欄=グローバル）</label>
                <select value={form.characterId} onChange={e => setForm(f => ({ ...f, characterId: e.target.value }))} className={inputCls}>
                  <option value="">グローバル（全キャラ共通）</option>
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>種別</label>
                  <select value={form.ruleType} onChange={e => setForm(f => ({ ...f, ruleType: e.target.value }))} className={inputCls}>
                    {RULE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>カテゴリ</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>重要度</label>
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className={inputCls}>
                  {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>パターン（ワード or 正規表現）</label>
                <input value={form.pattern} onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))} className={inputCls} placeholder="殺す|死ね" />
              </div>
              <div>
                <label className={labelCls}>説明</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>フェイルセーフ文面</label>
                <textarea value={form.fallbackMessage} onChange={e => setForm(f => ({ ...f, fallbackMessage: e.target.value }))} className={inputCls} rows={2}
                  placeholder="ごめんね、その話題はちょっと苦手なんだ…他のこと話そう？" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500" />
                有効
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? '保存中...' : editId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
