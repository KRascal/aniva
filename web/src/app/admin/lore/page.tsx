'use client';

import { useCallback, useEffect, useState } from 'react';

interface Franchise {
  id: string;
  name: string;
  nameEn: string | null;
  _count: { entries: number };
}

interface LoreEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  importance: number;
  spoilerLevel: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'event', label: 'イベント' },
  { value: 'character', label: 'キャラクター' },
  { value: 'location', label: 'ロケーション' },
  { value: 'ability', label: '能力・技' },
  { value: 'item', label: 'アイテム' },
  { value: 'relationship', label: '関係性' },
];

const CATEGORY_MAP: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const EMPTY_FORM = {
  title: '',
  content: '',
  category: 'event',
  keywords: '',
  importance: 5,
  spoilerLevel: 0,
};

export default function LorePage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [activeFranchise, setActiveFranchise] = useState<string>('');
  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editEntry, setEditEntry] = useState<LoreEntry | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load franchises
  useEffect(() => {
    fetch('/api/admin/lore')
      .then(r => r.json())
      .then(data => {
        const list = data.franchises || [];
        setFranchises(list);
        if (list.length > 0) setActiveFranchise(list[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load entries when franchise changes
  const loadEntries = useCallback(async (fid: string) => {
    if (!fid) return;
    setEntriesLoading(true);
    try {
      const r = await fetch(`/api/admin/lore?franchiseId=${fid}`);
      const data = await r.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    }
    setEntriesLoading(false);
  }, []);

  useEffect(() => {
    if (activeFranchise) loadEntries(activeFranchise);
  }, [activeFranchise, loadEntries]);

  // Create
  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/admin/lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseId: activeFranchise,
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
          keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
          importance: form.importance,
          spoilerLevel: form.spoilerLevel,
        }),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadEntries(activeFranchise);
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Update
  const handleUpdate = async () => {
    if (!editEntry) return;
    setEditSaving(true);
    try {
      await fetch(`/api/admin/lore/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim(),
          category: editForm.category,
          keywords: editForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
          importance: editForm.importance,
          spoilerLevel: editForm.spoilerLevel,
        }),
      });
      setEditEntry(null);
      loadEntries(activeFranchise);
    } catch { /* ignore */ }
    setEditSaving(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/lore/${id}`, { method: 'DELETE' });
      loadEntries(activeFranchise);
    } catch { /* ignore */ }
    setDeleting(null);
  };

  // Open edit
  const openEdit = (entry: LoreEntry) => {
    setEditEntry(entry);
    setEditForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      keywords: entry.keywords.join(', '),
      importance: entry.importance,
      spoilerLevel: entry.spoilerLevel,
    });
  };

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
          <h1 className="text-2xl font-bold text-white">📚 ローアブック</h1>
          <p className="text-gray-400 text-sm mt-1">フランチャイズごとの作品知識を管理</p>
        </div>
        {activeFranchise && (
          <button
            onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? '✕ 閉じる' : '＋ 新規作成'}
          </button>
        )}
      </div>

      {/* Franchise tabs */}
      {franchises.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {franchises.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFranchise(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFranchise === f.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f.name}
              <span className="ml-2 text-xs opacity-60">{f._count?.entries ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      {franchises.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">フランチャイズが登録されていません</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">新規エントリ作成</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">タイトル</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="例: 覇王色の覇気"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">カテゴリ</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">本文</label>
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              placeholder="ローア内容を記述..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">キーワード（カンマ区切り）</label>
              <input
                type="text"
                value={form.keywords}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="覇気, 覇王色, ルフィ"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">重要度: {form.importance}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={form.importance}
                onChange={e => setForm({ ...form, importance: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span><span>10</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ネタバレレベル</label>
              <select
                value={form.spoilerLevel}
                onChange={e => setForm({ ...form, spoilerLevel: Number(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={0}>なし</option>
                <option value={1}>軽微</option>
                <option value={2}>重大</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? '保存中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {activeFranchise && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {entriesLoading ? (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">エントリがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">タイトル</th>
                    <th className="px-4 py-3 font-medium">カテゴリ</th>
                    <th className="px-4 py-3 font-medium">キーワード</th>
                    <th className="px-4 py-3 font-medium text-center">重要度</th>
                    <th className="px-4 py-3 font-medium text-center">ネタバレ</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{entry.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{entry.content}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                          {CATEGORY_MAP[entry.category] || entry.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.keywords.slice(0, 3).map((kw, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                          {entry.keywords.length > 3 && (
                            <span className="text-gray-500 text-xs">+{entry.keywords.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono text-xs ${
                          entry.importance >= 8 ? 'text-red-400' :
                          entry.importance >= 5 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {entry.importance}/10
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.spoilerLevel === 0 && <span className="text-gray-500 text-xs">—</span>}
                        {entry.spoilerLevel === 1 && <span className="text-yellow-400 text-xs">⚠ 軽微</span>}
                        {entry.spoilerLevel === 2 && <span className="text-red-400 text-xs">🔴 重大</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(entry)}
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting === entry.id}
                            className="px-2.5 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            {deleting === entry.id ? '...' : '削除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditEntry(null)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">エントリ編集</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">タイトル</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">カテゴリ</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">本文</label>
              <textarea
                value={editForm.content}
                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">キーワード（カンマ区切り）</label>
                <input
                  type="text"
                  value={editForm.keywords}
                  onChange={e => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">重要度: {editForm.importance}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={editForm.importance}
                  onChange={e => setEditForm({ ...editForm, importance: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span><span>10</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ネタバレレベル</label>
                <select
                  value={editForm.spoilerLevel}
                  onChange={e => setEditForm({ ...editForm, spoilerLevel: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={0}>なし</option>
                  <option value={1}>軽微</option>
                  <option value={2}>重大</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditEntry(null)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={editSaving || !editForm.title.trim() || !editForm.content.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editSaving ? '保存中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
