'use client';

import { useState, useEffect, useCallback } from 'react';

interface Character {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
}

interface ScenarioRow {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isExpired: boolean;
  isLive: boolean;
  readCount: number;
  startsAt: string;
  endsAt: string;
  character: Character;
  contentPreview: string;
  createdAt: string;
}

interface FormState {
  characterId: string;
  title: string;
  description: string;
  content: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  characterId: '',
  title: '',
  description: '',
  content: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

function toLocalDateTimeInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadge(s: ScenarioRow) {
  if (!s.isActive) return <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">無効</span>;
  if (s.isLive) return <span className="px-2 py-0.5 rounded text-xs bg-green-700/50 text-green-300">🔴 配信中</span>;
  if (s.isExpired) return <span className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-300">期限切れ</span>;
  return <span className="px-2 py-0.5 rounded text-xs bg-blue-800/50 text-blue-300">予定</span>;
}

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullContent, setFullContent] = useState<Record<string, string>>({});

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scenarios');
      const data = await res.json();
      setScenarios(data.scenarios ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharacters = useCallback(async () => {
    const res = await fetch('/api/characters');
    const data = await res.json();
    setCharacters(data.characters ?? data ?? []);
  }, []);

  useEffect(() => {
    fetchScenarios();
    fetchCharacters();
  }, [fetchScenarios, fetchCharacters]);

  const openCreate = () => {
    setEditId(null);
    const now = new Date();
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setForm({
      ...EMPTY_FORM,
      startsAt: toLocalDateTimeInput(now.toISOString()),
      endsAt: toLocalDateTimeInput(next7d.toISOString()),
      characterId: characters[0]?.id ?? '',
    });
    setShowForm(true);
  };

  const openEdit = async (s: ScenarioRow) => {
    // fetch full content
    const res = await fetch(`/api/admin/scenarios/${s.id}`);
    const data = await res.json();
    const full = data.scenario;
    setEditId(s.id);
    setForm({
      characterId: s.character.id,
      title: s.title,
      description: s.description ?? '',
      content: full?.content ?? '',
      startsAt: toLocalDateTimeInput(s.startsAt),
      endsAt: toLocalDateTimeInput(s.endsAt),
      isActive: s.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      const url = editId ? `/api/admin/scenarios/${editId}` : '/api/admin/scenarios';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setEditId(null);
        setForm(EMPTY_FORM);
        await fetchScenarios();
      } else {
        const err = await res.json();
        alert(err.error ?? '保存失敗');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/scenarios/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteId(null);
      await fetchScenarios();
    } else {
      alert('削除失敗');
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!fullContent[id]) {
      const res = await fetch(`/api/admin/scenarios/${id}`);
      const data = await res.json();
      setFullContent((prev) => ({ ...prev, [id]: data.scenario?.content ?? '' }));
    }
    setExpandedId(id);
  };

  const live = scenarios.filter((s) => s.isLive);
  const scheduled = scenarios.filter((s) => s.isActive && !s.isLive && !s.isExpired);
  const expired = scenarios.filter((s) => s.isExpired || !s.isActive);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📖 限定シナリオ管理</h1>
          <p className="text-gray-500 text-sm mt-1">期間限定の絆シナリオを管理 — 見逃すと永遠に読めないFOMO設計</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          ＋ 新規作成
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{live.length}</div>
          <div className="text-xs text-gray-500 mt-1">配信中</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{scheduled.length}</div>
          <div className="text-xs text-gray-500 mt-1">予定</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-400">{expired.length}</div>
          <div className="text-xs text-gray-500 mt-1">終了済み</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-16">読み込み中...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-4xl mb-3">📖</p>
          <p>シナリオがありません。「＋ 新規作成」から追加してください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((s) => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                {s.character.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.character.avatarUrl} alt={s.character.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">👤</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {statusBadge(s)}
                    <span className="text-gray-500 text-xs">{s.character.name}</span>
                    <span className="text-gray-600 text-xs">・{s.readCount}人が読んだ</span>
                  </div>
                  <h3 className="font-bold text-white truncate">{s.title}</h3>
                  {s.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{s.description}</p>}
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{s.contentPreview}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span>開始: {new Date(s.startsAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>終了: {new Date(s.endsAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                  >
                    {expandedId === s.id ? '折りたたむ' : '全文'}
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setDeleteId(s.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
              {expandedId === s.id && fullContent[s.id] && (
                <div className="border-t border-gray-800 px-4 py-3 bg-gray-950">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{fullContent[s.id]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900/95 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">{editId ? 'シナリオ編集' : '新規シナリオ作成'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Character */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">キャラクター <span className="text-red-400">*</span></label>
                <select
                  value={form.characterId}
                  onChange={(e) => setForm((f) => ({ ...f, characterId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">選択...</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Title */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">タイトル <span className="text-red-400">*</span></label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例: ルフィの秘密の告白"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
              {/* Description */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">説明（探索ページに表示）</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="例: ルフィが初めて弱みを見せた夜の話"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
              {/* Content */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">シナリオ本文 <span className="text-red-400">*</span></label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="ここに限定シナリオの本文を書く。キャラの口調で書くと◎"
                  rows={10}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-y"
                />
                <p className="text-gray-600 text-xs mt-1">{form.content.length} 文字</p>
              </div>
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">開始日時 <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">終了日時 <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
              </div>
              {/* isActive */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-purple-600' : 'bg-gray-700'}`}
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-300">有効（explore に表示する）</span>
              </label>
            </div>
            <div className="border-t border-gray-800 px-6 py-4 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white text-sm transition-colors">キャンセル</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.characterId || !form.title || !form.content || !form.startsAt || !form.endsAt}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {saving ? '保存中...' : editId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold mb-2">本当に削除しますか？</p>
            <p className="text-gray-500 text-sm mb-5">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm">キャンセル</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
