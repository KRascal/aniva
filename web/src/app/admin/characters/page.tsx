'use client';

import { useEffect, useRef, useState } from 'react';

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
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  callCoinPerMin: number;
  fcOverageCallCoinPerMin: number;
  freeMessageLimit: number;
  freeCallMinutes: number;
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
  fcMonthlyPriceJpy: '3480',
  fcIncludedCallMin: '30',
  callCoinPerMin: '200',
  fcOverageCallCoinPerMin: '100',
  freeMessageLimit: '10',
  freeCallMinutes: '5',
};

// ---- Image Upload Field Component ----
function ImageUploadField({
  label,
  value,
  onChange,
  slug,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  slug: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const uploadFile = async (file: File) => {
    setUploadError('');
    if (!slug) {
      setUploadError('先にスラッグを入力してください');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slug', slug);

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'アップロードに失敗しました');
      } else {
        onChange(data.url);
      }
    } catch {
      setUploadError('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className={className}>
      <label className="block text-gray-400 text-sm mb-1">{label}</label>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center gap-1
          border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer
          transition-colors select-none
          ${dragging
            ? 'border-purple-500 bg-purple-900/20'
            : 'border-gray-600 hover:border-purple-500/60 hover:bg-gray-800/60'}
          ${uploading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-purple-400 text-sm py-1">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            アップロード中...
          </div>
        ) : (
          <>
            {/* Thumbnail preview */}
            {value && (
              <img
                src={value}
                alt="preview"
                className="w-20 h-20 object-cover rounded mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="text-gray-400 text-xs text-center">
              画像をドロップ or クリックしてアップロード
            </span>
            <span className="text-gray-600 text-xs">jpg / png / webp / gif ・ 最大 5MB</span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {uploadError && (
        <p className="text-red-400 text-xs mt-1">{uploadError}</p>
      )}

      {/* Manual URL input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="または URL を直接入力"
        className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}

// ---- Gross Margin Preview ----
function GrossMarginPreview({
  fcMonthlyPriceJpy,
  freeMessageLimit,
  fcIncludedCallMin,
}: {
  fcMonthlyPriceJpy: string;
  freeMessageLimit: string;
  fcIncludedCallMin: string;
}) {
  const price = parseInt(fcMonthlyPriceJpy, 10) || 0;
  const msgs = parseInt(freeMessageLimit, 10) || 0;
  const callMin = parseInt(fcIncludedCallMin, 10) || 0;

  const revenue = price * 0.96;
  const cost = msgs * 0.15 + callMin * 20;
  const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

  const marginColor =
    margin >= 60 ? 'text-green-400' :
    margin >= 40 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="mt-3 p-3 bg-gray-900/60 rounded-lg border border-gray-700/60">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">📊 粗利率プレビュー</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500">Web手取り</p>
          <p className="text-white font-medium">¥{Math.round(revenue).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">推定原価</p>
          <p className="text-white font-medium">¥{Math.round(cost).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">粗利率</p>
          <p className={`font-bold text-sm ${marginColor}`}>{margin.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
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
      fcMonthlyPriceJpy: String(c.fcMonthlyPriceJpy ?? 3480),
      fcIncludedCallMin: String(c.fcIncludedCallMin ?? 30),
      callCoinPerMin: String(c.callCoinPerMin ?? 200),
      fcOverageCallCoinPerMin: String(c.fcOverageCallCoinPerMin ?? 100),
      freeMessageLimit: String(c.freeMessageLimit ?? 10),
      freeCallMinutes: String(c.freeCallMinutes ?? 5),
    });
    setEditingId(c.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    const fcPrice = parseInt(form.fcMonthlyPriceJpy, 10);
    const callCoin = parseInt(form.callCoinPerMin, 10);
    const overageCoin = parseInt(form.fcOverageCallCoinPerMin, 10);

    if (!Number.isFinite(fcPrice) || fcPrice < 3480) {
      setError('FC月額は3480円以上を設定してください');
      return;
    }
    if (!Number.isFinite(callCoin) || callCoin < 200) {
      setError('通話料金（非FC）は200コイン/分以上を設定してください');
      return;
    }
    if (!Number.isFinite(overageCoin) || overageCoin < 100) {
      setError('FC超過通話料金は100コイン/分以上を設定してください');
      return;
    }

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

      const toInt = (v: string, fallback = 0) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
      };

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
        fcMonthlyPriceJpy: toInt(form.fcMonthlyPriceJpy, 3480),
        fcIncludedCallMin: toInt(form.fcIncludedCallMin, 30),
        callCoinPerMin: toInt(form.callCoinPerMin, 200),
        fcOverageCallCoinPerMin: toInt(form.fcOverageCallCoinPerMin, 100),
        freeMessageLimit: toInt(form.freeMessageLimit, 10),
        freeCallMinutes: toInt(form.freeCallMinutes, 5),
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
                <th className="text-right text-gray-400 text-sm px-4 py-3">月額</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">メッセージ数</th>
                <th className="text-center text-gray-400 text-sm px-4 py-3">状態</th>
                <th className="text-right text-gray-400 text-sm px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">読み込み中...</td></tr>
              ) : characters.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">キャラクターがありません</td></tr>
              ) : (
                characters.map((c) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">{c.name}</div>
                      <div className="text-gray-500 text-xs">{c.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{c.franchise}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className="text-yellow-400">¥{c.fcMonthlyPriceJpy.toLocaleString()}</span>
                    </td>
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
            </div>

            {/* Avatar & Cover image upload fields */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="アバター画像"
                value={form.avatarUrl}
                onChange={(v) => f('avatarUrl', v)}
                slug={form.slug}
              />
              <ImageUploadField
                label="カバー画像"
                value={form.coverUrl}
                onChange={(v) => f('coverUrl', v)}
                slug={form.slug}
              />
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

            {/* 料金設定セクション */}
            <div className="mt-6 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
              <h3 className="text-white font-semibold text-sm mb-4">💰 料金設定</h3>

              {/* FCメンバーシップ */}
              <div className="mb-4">
                <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3">👑 FCメンバーシップ</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">FC月額</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="3480"
                        value={form.fcMonthlyPriceJpy}
                        onChange={(e) => f('fcMonthlyPriceJpy', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">円</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">最低 ¥3,480</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">FC込み通話時間</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={form.fcIncludedCallMin}
                        onChange={(e) => f('fcIncludedCallMin', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">分/月</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">FC超過通話料金</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="100"
                        value={form.fcOverageCallCoinPerMin}
                        onChange={(e) => f('fcOverageCallCoinPerMin', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">コイン/分</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">最低 100コイン</p>
                  </div>
                </div>
              </div>

              {/* 無料枠 */}
              <div className="mb-4 pt-4 border-t border-gray-700/60">
                <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-3">🎁 無料枠</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">無料チャット上限</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={form.freeMessageLimit}
                        onChange={(e) => f('freeMessageLimit', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">通</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">0 = 無制限</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">無料通話上限</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={form.freeCallMinutes}
                        onChange={(e) => f('freeCallMinutes', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">分</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">0 = 無制限</p>
                  </div>
                </div>
              </div>

              {/* コイン課金（非FC） */}
              <div className="pt-4 border-t border-gray-700/60">
                <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">🪙 コイン課金（非FC）</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">通話料金 / 分</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="200"
                        value={form.callCoinPerMin}
                        onChange={(e) => f('callCoinPerMin', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">コイン/分</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">最低 200コイン</p>
                  </div>
                </div>
              </div>

              {/* 粗利率プレビュー */}
              <GrossMarginPreview
                fcMonthlyPriceJpy={form.fcMonthlyPriceJpy}
                freeMessageLimit={form.freeMessageLimit}
                fcIncludedCallMin={form.fcIncludedCallMin}
              />
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
