'use client';

import { useState, useEffect } from 'react';

export const RARITY_OPTIONS = ['N', 'R', 'SR', 'SSR', 'UR'] as const;
export const FRAME_TYPES = [
  { value: 'standard',  label: 'スタンダード' },
  { value: 'holo',      label: 'ホログラム' },
  { value: 'gold',      label: 'ゴールド' },
  { value: 'dark',      label: 'ダーク' },
  { value: 'rainbow',   label: 'レインボー' },
  { value: 'cursed',    label: 'カースド' },
] as const;

const RARITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  N:   { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  R:   { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  SR:  { bg: 'rgba(139,92,246,0.15)',  text: '#c084fc', border: 'rgba(139,92,246,0.3)' },
  SSR: { bg: 'rgba(234,179,8,0.15)',   text: '#fbbf24', border: 'rgba(234,179,8,0.3)' },
  UR:  { bg: 'rgba(236,72,153,0.15)',  text: '#f472b6', border: 'rgba(236,72,153,0.3)' },
};

export interface GachaCardEditData {
  id: string;
  name: string;
  description: string | null;
  rarity: string;
  category: string;
  characterId: string;
  franchise: string | null;
  cardImageUrl: string | null;
  illustrationUrl: string | null;
  frameType: string | null;
  effect: {
    effectColor?: string;
    effectText?: string;
    hasSpecialEffect?: boolean;
    [key: string]: unknown;
  } | null;
  character?: { name: string };
}

interface Character { id: string; name: string; }

interface Props {
  card: GachaCardEditData;
  characters: Character[];
  onClose: () => void;
  onSaved: () => void;
}

export default function GachaCardEditModal({ card, characters, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: card.name ?? '',
    description: card.description ?? '',
    rarity: card.rarity ?? 'R',
    category: card.category ?? 'memory',
    characterId: card.characterId,
    franchise: card.franchise ?? '',
    cardImageUrl: card.cardImageUrl ?? '',
    illustrationUrl: card.illustrationUrl ?? '',
    frameType: card.frameType ?? 'standard',
    effectColor: (card.effect?.effectColor as string) ?? '#a855f7',
    effectText: (card.effect?.effectText as string) ?? '',
    hasSpecialEffect: !!(card.effect?.hasSpecialEffect),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleChange = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.characterId || !form.rarity) {
      setError('カード名・キャラ・レアリティは必須です');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/admin/gacha/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: card.id,
          name: form.name,
          description: form.description || null,
          rarity: form.rarity,
          category: form.category,
          characterId: form.characterId,
          franchise: form.franchise || null,
          cardImageUrl: form.cardImageUrl || null,
          illustrationUrl: form.illustrationUrl || null,
          frameType: form.frameType || 'standard',
          effect: {
            effectColor: form.effectColor || '#a855f7',
            effectText: form.effectText || null,
            hasSpecialEffect: form.hasSpecialEffect,
          },
        }),
      });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        throw new Error(d.error || '保存失敗');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const rarityStyle = RARITY_STYLE[form.rarity] ?? RARITY_STYLE['N'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: rarityStyle.bg, color: rarityStyle.text, border: `1px solid ${rarityStyle.border}` }}
            >
              {form.rarity}
            </span>
            <h2 className="text-white font-semibold text-sm">{card.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm">
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">カード名 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Rarity + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">レアリティ <span className="text-red-400">*</span></label>
              <div className="flex gap-1.5 flex-wrap">
                {RARITY_OPTIONS.map((r) => {
                  const s = RARITY_STYLE[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleChange('rarity', r)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                      style={
                        form.rarity === r
                          ? { background: s.bg, color: s.text, border: `1px solid ${s.border}` }
                          : { background: 'rgba(255,255,255,0.03)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }
                      }
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">カテゴリ</label>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <option value="memory">メモリー</option>
                <option value="moment">モーメント</option>
                <option value="story">ストーリー</option>
                <option value="special">スペシャル</option>
                <option value="limited">限定</option>
              </select>
            </div>
          </div>

          {/* Character + Franchise */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">キャラクター <span className="text-red-400">*</span></label>
              <select
                value={form.characterId}
                onChange={(e) => handleChange('characterId', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <option value="">選択...</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">フランチャイズ</label>
              <input
                type="text"
                value={form.franchise}
                onChange={(e) => handleChange('franchise', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="ONE PIECE など"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">説明</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Images */}
          <div
            className="rounded-xl p-3 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs text-gray-500 font-medium">🖼️ 画像</p>
            <div>
              <label className="block text-[10px] text-gray-600 mb-1">カード画像 URL</label>
              <input
                type="url"
                value={form.cardImageUrl}
                onChange={(e) => handleChange('cardImageUrl', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                placeholder="https://..."
              />
              {form.cardImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.cardImageUrl} alt="preview" className="mt-1.5 h-12 rounded object-cover" />
              )}
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-1">イラスト URL</label>
              <input
                type="url"
                value={form.illustrationUrl}
                onChange={(e) => handleChange('illustrationUrl', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Frame Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">フレームタイプ</label>
            <div className="flex gap-1.5 flex-wrap">
              {FRAME_TYPES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleChange('frameType', f.value)}
                  className="px-3 py-1.5 rounded-xl text-xs transition-all"
                  style={
                    form.frameType === f.value
                      ? {
                          background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.15))',
                          border: '1px solid rgba(168,85,247,0.4)',
                          color: '#fff',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          color: '#6b7280',
                        }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Effect */}
          <div
            className="rounded-xl p-3 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs text-gray-500 font-medium">✨ 演出効果</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-600 mb-1">エフェクトカラー</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.effectColor}
                    onChange={(e) => handleChange('effectColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                    style={{ padding: '2px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    value={form.effectColor}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) handleChange('effectColor', e.target.value);
                    }}
                    className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs font-mono focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-1">エフェクトテキスト</label>
                <input
                  type="text"
                  value={form.effectText}
                  onChange={(e) => handleChange('effectText', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-white text-xs focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  placeholder="例: 呪術"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasSpecialEffect}
                onChange={(e) => handleChange('hasSpecialEffect', e.target.checked)}
                className="w-4 h-4 rounded accent-violet-500"
              />
              <span className="text-xs text-gray-400">💥 画面割れ演出あり</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
