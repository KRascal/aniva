'use client';

import { useEffect, useState } from 'react';

interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  systemPrompt: string;
  voiceModelId: string | null;
  catchphrases: string[];
  personalityTraits: unknown;
  avatarUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  messageCount: number;
  _count?: { relationships: number };
}

const EMPTY_FORM = {
  id: '',
  name: '',
  nameEn: '',
  slug: '',
  franchise: '',
  franchiseEn: '',
  description: '',
  systemPrompt: '',
  voiceModelId: '',
  catchphrases: '',
  personalityTraits: '[]',
  avatarUrl: '',
  coverUrl: '',
  isActive: true,
};

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/admin/characters');
    const data = await r.json();
    setCharacters(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (c: Character) => {
    setForm({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn || '',
      slug: c.slug,
      franchise: c.franchise,
      franchiseEn: c.franchiseEn || '',
      description: c.description || '',
      systemPrompt: c.systemPrompt,
      voiceModelId: c.voiceModelId || '',
      catchphrases: Array.isArray(c.catchphrases) ? c.catchphrases.join(', ') : '',
      personalityTraits: typeof c.personalityTraits === 'string' ? c.personalityTraits : JSON.stringify(c.personalityTraits, null, 2),
      avatarUrl: c.avatarUrl || '',
      coverUrl: c.coverUrl || '',
      isActive: c.isActive,
    });
    setEditingId(c.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      let personalityTraitsParsed;
      try {
        personalityTraitsParsed = JSON.parse(form.personalityTraits || '[]');
      } catch {
        setError('personalityTraitsのJSONが不正です');
        setSaving(false);
        return;
      }

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        nameEn: form.nameEn || null,
        slug: form.slug,
        franchise: form.franchise,
        franchiseEn: form.franchiseEn || null,
        description: form.description || null,
        systemPrompt: form.systemPrompt,
        voiceModelId: form.voiceModelId || null,
        catchphrases: form.catchphrases.split(',').map((s) => s.trim()).filter(Boolean),
        personalityTraits: personalityTraitsParsed,
        avatarUrl: form.avatarUrl || null,
        coverUrl: form.coverUrl || null,
        isActive: form.isActive,
      };

      const r = await fetch('/api/admin/characters', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const d = await r.json();
        setError(d.error || '保存に失敗しました');
      } else {
        setShowForm(false);
        load();
      }
    } catch {
      setError('保存に失敗しました');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`/api/admin/characters?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      setDeleteConfirm(null);
      load();
    }
  };

  const f = (key: keyof typeof EMPTY_FORM, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">キャラクター管理</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ＋ 新規キャラ追加
        </button>
      </div>

      {/* Characters table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm px-4 py-3">名前</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">フランチャイズ</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">メッセージ数</th>
                <th className="text-center text-gray-400 text-sm px-4 py-3">状態</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">読み込み中...</td></tr>
              ) : characters.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">キャラクターがありません</td></tr>
              ) : (
                characters.map((c) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">{c.name}</div>
                      <div className="text-gray-500 text-xs">{c.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{c.franchise}</td>
                    <td className="px-4 py-3 text-right text-white text-sm">{c.messageCount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        {c.isActive ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-purple-400 hover:text-purple-300 text-sm mr-3"
                      >編集</button>
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">キャラクターを削除しますか？</h3>
            <p className="text-gray-400 text-sm mb-6">この操作は取り消せません。関連するすべてのデータが削除されます。</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >削除する</button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-2xl my-8">
            <h2 className="text-white font-bold text-lg mb-6">
              {editingId ? 'キャラクター編集' : '新規キャラクター追加'}
            </h2>

            {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="名前 *" value={form.name} onChange={(v) => f('name', v)} />
              <Field label="名前（英語）" value={form.nameEn} onChange={(v) => f('nameEn', v)} />
              <Field label="スラッグ *" value={form.slug} onChange={(v) => f('slug', v)} placeholder="e.g. luffy" />
              <Field label="フランチャイズ *" value={form.franchise} onChange={(v) => f('franchise', v)} />
              <Field label="フランチャイズ（英語）" value={form.franchiseEn} onChange={(v) => f('franchiseEn', v)} />
              <Field label="音声モデルID" value={form.voiceModelId} onChange={(v) => f('voiceModelId', v)} />
              <Field label="アバターURL" value={form.avatarUrl} onChange={(v) => f('avatarUrl', v)} className="sm:col-span-2" />
              <Field label="カバーURL" value={form.coverUrl} onChange={(v) => f('coverUrl', v)} className="sm:col-span-2" />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => f('description', e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">システムプロンプト *</label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => f('systemPrompt', e.target.value)}
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">キャッチフレーズ（カンマ区切り）</label>
              <input
                type="text"
                value={form.catchphrases}
                onChange={(e) => f('catchphrases', e.target.value)}
                placeholder="俺は海賊王になる！, 一緒に冒険しよう"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">パーソナリティトレイト（JSON配列）</label>
              <textarea
                value={form.personalityTraits}
                onChange={(e) => f('personalityTraits', e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-gray-400 text-sm">アクティブ</label>
              <button
                type="button"
                onClick={() => f('isActive', !form.isActive)}
                className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >{saving ? '保存中...' : '保存'}</button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-gray-400 text-sm mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}
