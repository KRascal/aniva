'use client';

import { useEffect, useRef, useState } from 'react';

interface MediaItem {
  key: string;
  url: string;
  characterSlug?: string;
  characterName?: string;
  size?: number;
  lastModified?: string;
}

interface Character {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChar, setFilterChar] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [selectedChar, setSelectedChar] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchMedia() {
    try {
      const r = await fetch('/api/admin/media');
      if (r.ok) {
        const data = await r.json();
        setItems(data.items ?? data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [, charRes] = await Promise.all([
        fetchMedia(),
        fetch('/api/admin/characters'),
      ]);
      if (charRes.ok) {
        const data = await charRes.json();
        setCharacters(Array.isArray(data) ? data : data.characters ?? []);
      }
    }
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedChar) {
      showToast('アップロード先のキャラクターを選択してください', 'err');
      e.target.value = '';
      return;
    }

    const char = characters.find((c) => c.id === selectedChar);
    if (!char) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', char.slug);
      formData.append('folder', 'characters');

      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (r.ok) {
        showToast('アップロード成功！');
        setLoading(true);
        await fetchMedia();
      } else {
        const err = await r.json();
        showToast(err.error ?? 'アップロードに失敗しました', 'err');
      }
    } catch {
      showToast('ネットワークエラー', 'err');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(key: string) {
    setDeleting(key);
    try {
      const r = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (r.ok) {
        showToast('削除しました');
        setDeleteConfirm(null);
        setItems((prev) => prev.filter((i) => i.key !== key));
      } else {
        const err = await r.json();
        showToast(err.error ?? '削除に失敗しました', 'err');
      }
    } catch {
      showToast('ネットワークエラー', 'err');
    } finally {
      setDeleting(null);
    }
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  const filtered = filterChar
    ? items.filter((i) => i.characterSlug === filterChar || i.key.includes(filterChar))
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">メディア管理</h1>
          <p className="text-sm text-gray-400 mt-1">キャラクター画像・メディアファイルの管理</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${
            toast.type === 'ok'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="rounded-2xl p-5 flex flex-wrap items-center gap-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Character filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 whitespace-nowrap">フィルター:</label>
          <select
            value={filterChar}
            onChange={(e) => setFilterChar(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="">全キャラ</option>
            {characters.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Upload */}
        <div className="flex items-center gap-2">
          <select
            value={selectedChar}
            onChange={(e) => setSelectedChar(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="">アップロード先キャラ選択</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] disabled:opacity-50"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}
          >
            {uploading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </div>

        <span className="text-xs text-gray-500 ml-auto">{filtered.length}件</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-gray-500 text-sm">画像がありません</p>
          <p className="text-gray-600 text-xs mt-1">キャラクターを選択してアップロードしてください</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div
              key={item.key}
              className="group relative rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Image */}
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.key}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    title="新しいタブで開く"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {deleteConfirm === item.key ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(item.key)}
                        disabled={deleting === item.key}
                        className="px-2 py-1 rounded-lg bg-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/50 transition-all"
                      >
                        {deleting === item.key ? '...' : '確認'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(item.key)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs text-gray-400 truncate" title={item.key}>
                  {item.key.split('/').pop()}
                </p>
                <div className="flex items-center justify-between mt-1">
                  {item.characterName && (
                    <span className="text-xs text-violet-400 truncate">{item.characterName}</span>
                  )}
                  {item.size && (
                    <span className="text-xs text-gray-600 ml-auto">{formatSize(item.size)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
