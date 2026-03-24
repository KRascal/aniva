'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface StickerItem {
  url: string;
  label?: string;
}

interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stickers: StickerItem[];
  isActive: boolean;
  createdAt: string;
  _count: { purchases: number };
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: 100,
  stickers: [] as StickerItem[],
  isActive: true,
};

export default function AdminStickersPage() {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── 一覧URL入力（複数）
  const [newStickerUrl, setNewStickerUrl] = useState('');
  const [newStickerLabel, setNewStickerLabel] = useState('');

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stickers');
      const data = await res.json();
      setPacks(data.packs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (pack: StickerPack) => {
    setEditingId(pack.id);
    setForm({
      name: pack.name,
      description: pack.description ?? '',
      price: pack.price,
      stickers: Array.isArray(pack.stickers) ? pack.stickers : [],
      isActive: pack.isActive,
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

  const handleAddSticker = () => {
    if (!newStickerUrl.trim()) return;
    setForm((prev) => ({
      ...prev,
      stickers: [...prev.stickers, { url: newStickerUrl.trim(), label: newStickerLabel.trim() || undefined }],
    }));
    setNewStickerUrl('');
    setNewStickerLabel('');
  };

  const handleRemoveSticker = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      stickers: prev.stickers.filter((_, i) => i !== idx),
    }));
  };

  // R2 アップロード
  const handleFileUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'content');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      const url: string = data.url ?? data.publicUrl ?? '';
      if (!url) throw new Error('No URL returned');

      if (idx === -1) {
        // 新規追加
        setNewStickerUrl(url);
      } else {
        setForm((prev) => {
          const next = [...prev.stickers];
          next[idx] = { ...next[idx], url };
          return { ...prev, stickers: next };
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロード失敗');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.stickers.length === 0) {
      setError('スタンプ画像を1つ以上追加してください');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      stickers: form.stickers,
      isActive: form.isActive,
    };

    try {
      const url = editingId ? `/api/admin/stickers/${editingId}` : '/api/admin/stickers';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setSuccess(editingId ? 'パックを更新しました' : 'パックを作成しました');
        setShowForm(false);
        setEditingId(null);
        fetchPacks();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよいですか？\n購入済みユーザーの記録も削除されます。`)) return;

    try {
      const res = await fetch(`/api/admin/stickers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '削除に失敗しました');
      } else {
        setSuccess('削除しました');
        fetchPacks();
      }
    } catch {
      alert('通信エラーが発生しました');
    }
  };

  const handleToggleActive = async (pack: StickerPack) => {
    try {
      const res = await fetch(`/api/admin/stickers/${pack.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pack.isActive }),
      });
      if (res.ok) fetchPacks();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">スタンプ管理</h1>
          <p className="text-gray-500 text-sm mt-1">スタンプパックの作成・編集・削除（全{total}件）</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
        >
          + 新規パック作成
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="px-4 py-3 rounded-xl text-sm text-green-300 border border-green-500/20 bg-green-500/10">
          {success}
        </div>
      )}
      {error && !showForm && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20 bg-red-500/10">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-lg font-bold text-white">
            {editingId ? 'パックを編集' : '新規スタンプパック'}
          </h2>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-300 border border-red-500/20 bg-red-500/10">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">パック名 *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: ネコスタンプパック Vol.1"
                className="w-full px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">説明</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="パックの説明（任意）"
                className="w-full px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">価格（コイン）</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
                className="w-40 px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none"
              />
            </div>

            {/* Sticker List */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                スタンプ画像 ({form.stickers.length}枚)
              </label>

              {/* Existing stickers */}
              {form.stickers.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {form.stickers.map((sticker, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sticker.url}
                        alt={sticker.label ?? `sticker-${idx}`}
                        className="w-full h-20 object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      {sticker.label && (
                        <div className="text-center text-xs text-gray-400 px-1 pb-1 truncate">
                          {sticker.label}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSticker(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      {/* replace file */}
                      <button
                        type="button"
                        onClick={() => fileRefs.current[idx]?.click()}
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-xs bg-black/60 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {uploadingIdx === idx ? '...' : '↑'}
                      </button>
                      <input
                        ref={(el) => { fileRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(idx, f);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Add new sticker */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}
              >
                <p className="text-xs text-gray-500">URLを入力するか、ファイルをアップロード</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStickerUrl}
                    onChange={(e) => setNewStickerUrl(e.target.value)}
                    placeholder="https://... または R2アップロード後に自動入力"
                    className="flex-1 px-3 py-1.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newStickerLabel}
                    onChange={(e) => setNewStickerLabel(e.target.value)}
                    placeholder="ラベル（任意）"
                    className="w-28 px-3 py-1.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-300 cursor-pointer hover:bg-white/5 border border-white/10 transition-colors">
                    {uploadingIdx === -1 ? (
                      <span className="animate-pulse">アップロード中...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                        R2にアップロード
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIdx !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(-1, f);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSticker}
                    disabled={!newStickerUrl.trim()}
                    className="px-3 py-1.5 rounded-xl text-sm text-white bg-violet-600/50 hover:bg-violet-600/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-violet-600' : 'bg-gray-700'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-5' : ''}`}
                />
              </button>
              <span className="text-sm text-gray-300">
                {form.isActive ? '販売中' : '非アクティブ'}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
              >
                {submitting ? '保存中...' : editingId ? '更新' : '作成'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pack List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">🎭</div>
          <p>スタンプパックがまだありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packs.map((pack) => {
            const stickers = Array.isArray(pack.stickers) ? pack.stickers : [];
            return (
              <div
                key={pack.id}
                className="rounded-2xl p-5 flex items-center gap-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Preview thumbnails */}
                <div className="flex gap-1 flex-shrink-0">
                  {stickers.slice(0, 4).map((s, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={s.url}
                      alt={s.label ?? `s${i}`}
                      className="w-12 h-12 rounded-lg object-contain bg-white/5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ))}
                  {stickers.length > 4 && (
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xs text-gray-500">
                      +{stickers.length - 4}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold truncate">{pack.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        pack.isActive
                          ? 'text-green-400 bg-green-500/15'
                          : 'text-gray-500 bg-gray-500/15'
                      }`}
                    >
                      {pack.isActive ? '販売中' : '非公開'}
                    </span>
                  </div>
                  {pack.description && (
                    <p className="text-sm text-gray-500 truncate mb-1">{pack.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>💰 {pack.price}コイン</span>
                    <span>🎭 {stickers.length}枚</span>
                    <span>👥 {pack._count.purchases}件購入</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(pack)}
                    className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-white/10 transition-all"
                  >
                    {pack.isActive ? '非公開化' : '公開'}
                  </button>
                  <button
                    onClick={() => handleEdit(pack)}
                    className="px-3 py-1.5 rounded-xl text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/20 transition-all"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(pack.id, pack.name)}
                    className="px-3 py-1.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
