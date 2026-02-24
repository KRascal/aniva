'use client';

import { useEffect, useState } from 'react';

interface MomentRow {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  visibility: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  type: string;
  character: { id: string; name: string; avatarUrl: string | null };
  _count: { reactions: number };
}

interface Character {
  id: string;
  name: string;
}

const VISIBILITY_OPTIONS = ['PUBLIC', 'STANDARD', 'PREMIUM', 'LEVEL_LOCKED'];
const TYPE_OPTIONS = ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO'];

const EMPTY_FORM = {
  characterId: '',
  type: 'TEXT',
  content: '',
  mediaUrl: '',
  visibility: 'PUBLIC',
  scheduledAt: '',
};

export default function MomentsPage() {
  const [moments, setMoments] = useState<MomentRow[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadMoments = async (p = 1) => {
    setLoading(true);
    const r = await fetch(`/api/admin/moments?page=${p}`);
    const data = await r.json();
    setMoments(data.moments || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  };

  const loadCharacters = async () => {
    const r = await fetch('/api/admin/characters');
    const data = await r.json();
    setCharacters(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadMoments(page);
    loadCharacters();
  }, [page]);

  const handleSubmit = async () => {
    setError('');
    if (!form.characterId) { setError('キャラクターを選択してください'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: form.characterId,
          type: form.type,
          content: form.content || null,
          mediaUrl: form.mediaUrl || null,
          visibility: form.visibility,
          scheduledAt: form.scheduledAt || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        setError(d.error || '作成に失敗しました');
      } else {
        setShowForm(false);
        setForm(EMPTY_FORM);
        loadMoments(1);
        setPage(1);
      }
    } catch {
      setError('作成に失敗しました');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`/api/admin/moments?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      setDeleteConfirm(null);
      loadMoments(page);
    }
  };

  const f = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const visibilityLabel = (v: string) => {
    const map: Record<string, string> = { PUBLIC: '公開', STANDARD: 'スタンダード', PREMIUM: 'プレミアム', LEVEL_LOCKED: 'レベル限定' };
    return map[v] || v;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">モーメント管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">総計: {total.toLocaleString()}</span>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowForm(true); setError(''); }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >＋ 新規Moment作成</button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm px-4 py-3">キャラ</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">内容</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">種別</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">公開状態</th>
                <th className="text-left text-gray-400 text-sm px-4 py-3">日時</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">リアクション</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">読み込み中...</td></tr>
              ) : moments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">モーメントがありません</td></tr>
              ) : (
                moments.map((m) => (
                  <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white text-sm font-medium whitespace-nowrap">{m.character.name}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm max-w-[200px]">
                      <div className="truncate">{m.content || (m.mediaUrl ? '📷 メディア' : '—')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">{m.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${m.publishedAt ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                        {m.publishedAt ? visibilityLabel(m.visibility) : '予約済み'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(m.publishedAt || m.scheduledAt || m.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{m._count.reactions}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteConfirm(m.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-800">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded">←</button>
            <span className="text-gray-400 text-sm">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded">→</button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">Momentを削除しますか？</h3>
            <p className="text-gray-400 text-sm mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">削除する</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-lg">
            <h2 className="text-white font-bold text-lg mb-6">新規Moment作成</h2>

            {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">キャラクター *</label>
                <select
                  value={form.characterId}
                  onChange={(e) => f('characterId', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">選択してください</option>
                  {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">種別</label>
                  <select value={form.type} onChange={(e) => f('type', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">公開設定</label>
                  <select value={form.visibility} onChange={(e) => f('visibility', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    {VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">テキスト内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => f('content', e.target.value)}
                  rows={4}
                  placeholder="投稿内容を入力..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">メディアURL（任意）</label>
                <input
                  type="text"
                  value={form.mediaUrl}
                  onChange={(e) => f('mediaUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">予約投稿日時（任意・空欄で即時公開）</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => f('scheduledAt', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleSubmit} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium">
                {saving ? '作成中...' : '作成する'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
