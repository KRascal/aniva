'use client';

import { useEffect, useState, useCallback } from 'react';

interface Character {
  id: string;
  name: string;
}

interface StoryChapter {
  id: string;
  characterId: string;
  character: { id: string; name: string };
  chapterNumber: number;
  locale: string;
  title: string;
  synopsis: string;
  unlockLevel: number;
  isFcOnly: boolean;
  triggerPrompt: string;
  isActive: boolean;
  backgroundUrl: string | null;
  coinReward: number;
  createdAt: string;
}

const EMPTY_FORM = {
  characterId: '',
  chapterNumber: 1,
  locale: 'ja',
  title: '',
  synopsis: '',
  unlockLevel: 1,
  isFcOnly: false,
  triggerPrompt: '',
  isActive: true,
  backgroundUrl: '',
  coinReward: 5,
};

export default function AdminStoriesPage() {
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [total, setTotal] = useState(0);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stories');
      const data = await res.json();
      setChapters(data.chapters ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('ストーリーズ一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await fetch('/api/characters?limit=100');
      const data = await res.json();
      setCharacters(data.characters ?? data ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchChapters();
    fetchCharacters();
  }, [fetchChapters, fetchCharacters]);

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (chapter: StoryChapter) => {
    setEditingId(chapter.id);
    setForm({
      characterId: chapter.characterId,
      chapterNumber: chapter.chapterNumber,
      locale: chapter.locale,
      title: chapter.title,
      synopsis: chapter.synopsis,
      unlockLevel: chapter.unlockLevel,
      isFcOnly: chapter.isFcOnly,
      triggerPrompt: chapter.triggerPrompt,
      isActive: chapter.isActive,
      backgroundUrl: chapter.backgroundUrl ?? '',
      coinReward: chapter.coinReward,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      characterId: form.characterId,
      chapterNumber: Number(form.chapterNumber),
      locale: form.locale,
      title: form.title,
      synopsis: form.synopsis,
      unlockLevel: Number(form.unlockLevel),
      isFcOnly: form.isFcOnly,
      triggerPrompt: form.triggerPrompt,
      isActive: form.isActive,
      backgroundUrl: form.backgroundUrl || null,
      coinReward: Number(form.coinReward),
    };

    try {
      const res = await fetch('/api/admin/stories', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setSuccess(editingId ? 'チャプターを更新しました' : 'チャプターを追加しました');
        setShowForm(false);
        setEditingId(null);
        fetchChapters();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      const res = await fetch(`/api/admin/stories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '削除に失敗しました');
      } else {
        setSuccess('チャプターを削除しました');
        fetchChapters();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  const handleToggleActive = async (chapter: StoryChapter) => {
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chapter.id, isActive: !chapter.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '更新に失敗しました');
      } else {
        fetchChapters();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📖 ストーリーズ管理</h1>
          <p className="text-gray-400 text-sm mt-1">チャプター数: {total}</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          ＋ チャプター追加
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* フォーム */}
      {showForm && (
        <div className="mb-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'チャプターを編集' : '新しいチャプターを追加'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">キャラクター *</label>
              <select
                value={form.characterId}
                onChange={(e) => setForm({ ...form, characterId: e.target.value })}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">選択してください</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">チャプター番号 *</label>
              <input
                type="number"
                value={form.chapterNumber}
                onChange={(e) => setForm({ ...form, chapterNumber: Number(e.target.value) })}
                required
                min={1}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">タイトル *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="チャプタータイトル"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">あらすじ *</label>
              <textarea
                value={form.synopsis}
                onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
                required
                rows={3}
                placeholder="チャプターのあらすじ"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">トリガープロンプト *</label>
              <textarea
                value={form.triggerPrompt}
                onChange={(e) => setForm({ ...form, triggerPrompt: e.target.value })}
                required
                rows={3}
                placeholder="AIへの指示プロンプト"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">解放レベル</label>
              <input
                type="number"
                value={form.unlockLevel}
                onChange={(e) => setForm({ ...form, unlockLevel: Number(e.target.value) })}
                min={1}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">コイン報酬</label>
              <input
                type="number"
                value={form.coinReward}
                onChange={(e) => setForm({ ...form, coinReward: Number(e.target.value) })}
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">ロケール</label>
              <select
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">背景画像URL</label>
              <input
                type="url"
                value={form.backgroundUrl}
                onChange={(e) => setForm({ ...form, backgroundUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="flex gap-6 mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFcOnly}
                  onChange={(e) => setForm({ ...form, isFcOnly: e.target.checked })}
                  className="w-4 h-4"
                />
                FCのみ
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                公開する
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
              >
                {submitting ? '保存中...' : editingId ? '更新する' : '追加する'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 一覧テーブル */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : chapters.length === 0 ? (
          <div className="p-8 text-center text-gray-400">チャプターがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">タイトル</th>
                  <th className="px-4 py-3 text-left">キャラ</th>
                  <th className="px-4 py-3 text-center">Ch.</th>
                  <th className="px-4 py-3 text-center">解放Lv</th>
                  <th className="px-4 py-3 text-center">FCのみ</th>
                  <th className="px-4 py-3 text-right">コイン</th>
                  <th className="px-4 py-3 text-center">状態</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {chapters.map((chapter) => (
                  <tr key={chapter.id} className="hover:bg-gray-750 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{chapter.title}</div>
                      <div className="text-gray-400 text-xs truncate max-w-xs">{chapter.synopsis}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{chapter.character.name}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{chapter.chapterNumber}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{chapter.unlockLevel}</td>
                    <td className="px-4 py-3 text-center">
                      {chapter.isFcOnly ? (
                        <span className="text-purple-400 text-xs font-medium">FC限定</span>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-mono">{chapter.coinReward}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(chapter)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          chapter.isActive
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {chapter.isActive ? '公開中' : '非公開'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(chapter)}
                          className="px-3 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 rounded text-xs transition"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(chapter.id, chapter.title)}
                          className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded text-xs transition"
                        >
                          削除
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
    </div>
  );
}
