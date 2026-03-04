'use client';

import { useEffect, useState, useRef } from 'react';

interface Character {
  id: string;
  name: string;
  slug: string;
}

interface DlContent {
  id: string;
  characterId: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fcOnly: boolean;
  downloadCount: number;
  createdAt: string;
  character: { id: string; name: string; slug: string };
}

const CONTENT_TYPES = [
  { value: 'wallpaper', label: '🖼 壁紙' },
  { value: 'voice_clip', label: '🎙 ボイスクリップ' },
  { value: 'special_art', label: '🎨 特別イラスト' },
  { value: 'video', label: '🎬 動画' },
  { value: 'pdf', label: '📄 PDF' },
  { value: 'other', label: '📦 その他' },
];

const TYPE_ICON: Record<string, string> = {
  wallpaper: '🖼',
  voice_clip: '🎙',
  special_art: '🎨',
  video: '🎬',
  pdf: '📄',
  other: '📦',
};

const EMPTY_FORM = {
  characterId: '',
  title: '',
  description: '',
  type: 'wallpaper',
  fcOnly: true,
};

export default function DownloadableContentPage() {
  const [contents, setContents] = useState<DlContent[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCharId, setFilterCharId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [contentsRes, charsRes] = await Promise.all([
        fetch(`/api/admin/downloadable-content${filterCharId ? `?characterId=${filterCharId}` : ''}`),
        fetch('/api/admin/characters?limit=100'),
      ]);
      const [cd, ch] = await Promise.all([contentsRes.json(), charsRes.json()]);
      setContents(cd.contents ?? []);
      setCharacters(ch.characters ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCharId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !form.characterId || !form.title || !form.type) {
      setError('ファイル・キャラクター・タイトル・種別は必須です');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('characterId', form.characterId);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('type', form.type);
      fd.append('fcOnly', String(form.fcOnly));
      if (thumbnail) fd.append('thumbnail', thumbnail);

      const r = await fetch('/api/admin/downloadable-content', { method: 'POST', body: fd });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? '保存失敗');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFile(null);
      setThumbnail(null);
      if (fileRef.current) fileRef.current.value = '';
      if (thumbRef.current) thumbRef.current.value = '';
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/downloadable-content?id=${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      await load();
    } catch {
      setError('削除失敗');
    }
  };

  const toggleFcOnly = async (content: DlContent) => {
    await fetch('/api/admin/downloadable-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: content.id, fcOnly: !content.fcOnly }),
    });
    await load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 限定DLコンテンツ管理</h1>
          <p className="text-gray-400 text-sm mt-1">FC会員向けダウンロードコンテンツを登録・管理</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ＋ 新規追加
        </button>
      </div>

      {/* フィルター */}
      <div className="mb-4">
        <select
          value={filterCharId}
          onChange={e => setFilterCharId(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全キャラクター</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-gray-400 text-sm ml-3">{contents.length}件</span>
      </div>

      {/* 新規追加フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">新規コンテンツ追加</h2>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">キャラクター *</label>
                <select
                  value={form.characterId}
                  onChange={e => setForm({ ...form, characterId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">選択してください</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">タイトル *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="例: ルフィ 夏の壁紙 vol.1"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">説明</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="例: スマホ向け(1080×1920px)"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">種別 *</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  {CONTENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">ファイル * (最大50MB)</label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  accept="image/*,audio/*,video/*,.pdf,.zip"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">サムネイル（省略可）</label>
                <input
                  ref={thumbRef}
                  type="file"
                  onChange={e => setThumbnail(e.target.files?.[0] ?? null)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  accept="image/*"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fcOnly"
                  checked={form.fcOnly}
                  onChange={e => setForm({ ...form, fcOnly: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="fcOnly" className="text-white text-sm">FC会員限定</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? 'アップロード中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); setFile(null); setThumbnail(null); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* コンテンツ一覧 */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">読み込み中...</div>
      ) : contents.length === 0 ? (
        <div className="text-gray-500 text-center py-12">
          <div className="text-4xl mb-2">📭</div>
          <p>コンテンツがありません。「新規追加」から登録してください。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contents.map(c => (
            <div key={c.id} className="bg-gray-900 rounded-xl border border-white/8 p-4 flex items-center gap-4">
              {/* サムネ or アイコン */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{TYPE_ICON[c.type] ?? '📦'}</span>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">{c.title}</span>
                  {c.fcOnly && (
                    <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700/40 px-1.5 py-0.5 rounded-full flex-shrink-0">FC限定</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-gray-500 text-xs">{c.character.name}</span>
                  <span className="text-gray-600 text-xs">{CONTENT_TYPES.find(t => t.value === c.type)?.label ?? c.type}</span>
                  <span className="text-gray-600 text-xs">{c.downloadCount.toLocaleString()}DL</span>
                  <span className="text-gray-700 text-xs">{new Date(c.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                {c.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{c.description}</p>}
              </div>

              {/* アクション */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={c.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  確認
                </a>
                <button
                  onClick={() => toggleFcOnly(c)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors border ${
                    c.fcOnly
                      ? 'bg-purple-900/40 text-purple-300 border-purple-700/40 hover:bg-purple-900/60'
                      : 'bg-gray-700/40 text-gray-400 border-gray-600/40 hover:bg-gray-700/60'
                  }`}
                >
                  {c.fcOnly ? 'FC限定' : '全員'}
                </button>
                {deleteConfirm === c.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1.5 rounded-lg transition-colors"
                    >
                      削除確認
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs bg-gray-700 text-gray-300 px-2 py-1.5 rounded-lg"
                    >
                      戻る
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className="text-xs bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors border border-gray-700/40"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
