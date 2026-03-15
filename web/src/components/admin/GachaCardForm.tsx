'use client';

import { Dispatch, SetStateAction } from 'react';

interface Character { id: string; name: string; avatarUrl: string | null; }

const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'] as const;

export const FRANCHISES = ['ONE PIECE', '鬼滅の刃', '呪術廻戦', 'カスタム'] as const;

export const FRAME_TYPES = [
  { value: 'standard', label: 'スタンダード' },
  { value: 'gold',     label: 'ゴールド' },
  { value: 'rainbow',  label: 'レインボー' },
] as const;

export interface CardFormState {
  name: string;
  description: string;
  characterId: string;
  rarity: string;
  category: string;
  franchise: string;
  cardImageUrl: string;
  illustrationUrl: string;
  frameType: string;
  effectColor: string;
  effectText: string;
  hasSpecialEffect: boolean;
}

interface Props {
  characters: Character[];
  cardForm: CardFormState;
  setCardForm: Dispatch<SetStateAction<CardFormState>>;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function GachaCardForm({
  characters,
  cardForm,
  setCardForm,
  saving,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-purple-700">
      <h3 className="font-semibold mb-3">新規カード</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">

        {/* カード名 */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">カード名 *</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="例: ルフィ 熱き宣言"
            value={cardForm.name}
            onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
          />
        </div>

        {/* 説明 */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">説明</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="カードの説明文"
            value={cardForm.description}
            onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
          />
        </div>

        {/* キャラクター */}
        <div>
          <label className="text-gray-400 block mb-1">キャラクター *</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={cardForm.characterId}
            onChange={(e) => setCardForm({ ...cardForm, characterId: e.target.value })}
          >
            <option value="">選択してください</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* レアリティ */}
        <div>
          <label className="text-gray-400 block mb-1">レアリティ *</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={cardForm.rarity}
            onChange={(e) => setCardForm({ ...cardForm, rarity: e.target.value })}
          >
            {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* カテゴリ */}
        <div>
          <label className="text-gray-400 block mb-1">カテゴリ</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={cardForm.category}
            onChange={(e) => setCardForm({ ...cardForm, category: e.target.value })}
          >
            <option value="memory">memory</option>
            <option value="scene">scene</option>
            <option value="voice">voice</option>
            <option value="art">art</option>
          </select>
        </div>

        {/* フランチャイズ */}
        <div>
          <label className="text-gray-400 block mb-1">フランチャイズ</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={cardForm.franchise}
            onChange={(e) => setCardForm({ ...cardForm, franchise: e.target.value })}
          >
            <option value="">選択なし</option>
            {FRANCHISES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* フレームタイプ */}
        <div>
          <label className="text-gray-400 block mb-1">フレームタイプ</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={cardForm.frameType}
            onChange={(e) => setCardForm({ ...cardForm, frameType: e.target.value })}
          >
            {FRAME_TYPES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* カード表面画像URL */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">カード表面画像URL</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="https://example.com/card.jpg"
            value={cardForm.cardImageUrl}
            onChange={(e) => setCardForm({ ...cardForm, cardImageUrl: e.target.value })}
          />
        </div>

        {/* フルイラスト画像URL */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">フルイラスト画像URL</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="https://example.com/illustration.jpg"
            value={cardForm.illustrationUrl}
            onChange={(e) => setCardForm({ ...cardForm, illustrationUrl: e.target.value })}
          />
        </div>

        {/* ---- 演出設定 ---- */}
        <div className="col-span-2 mt-2 border-t border-gray-700 pt-3">
          <p className="text-gray-300 text-xs font-semibold mb-3 uppercase tracking-wider">✨ レアリティ演出設定</p>
        </div>

        {/* 演出カラー */}
        <div>
          <label className="text-gray-400 block mb-1">演出カラー</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="w-10 h-9 rounded cursor-pointer bg-gray-700 border-0 p-0.5"
              value={cardForm.effectColor}
              onChange={(e) => setCardForm({ ...cardForm, effectColor: e.target.value })}
            />
            <input
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-white text-sm font-mono"
              placeholder="#a855f7"
              value={cardForm.effectColor}
              onChange={(e) => setCardForm({ ...cardForm, effectColor: e.target.value })}
            />
          </div>
        </div>

        {/* 特殊演出フラグ（画面割れ） */}
        <div className="flex flex-col justify-center">
          <label className="text-gray-400 block mb-1">特殊演出（画面割れ）</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-10 h-6 rounded-full transition-colors ${cardForm.hasSpecialEffect ? 'bg-purple-600' : 'bg-gray-600'}`}
              onClick={() => setCardForm({ ...cardForm, hasSpecialEffect: !cardForm.hasSpecialEffect })}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${cardForm.hasSpecialEffect ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className={`text-xs font-medium ${cardForm.hasSpecialEffect ? 'text-purple-300' : 'text-gray-500'}`}>
              {cardForm.hasSpecialEffect ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        {/* 演出テキスト */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">演出テキスト</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="例: ★★★ SUPER RARE ★★★"
            value={cardForm.effectText}
            onChange={(e) => setCardForm({ ...cardForm, effectText: e.target.value })}
          />
          <p className="text-gray-600 text-[10px] mt-1">ガチャ演出時に表示されるカスタムテキスト</p>
          {cardForm.effectText && (
            <div
              className="mt-2 text-center py-2 rounded-lg text-sm font-bold tracking-widest"
              style={{ color: cardForm.effectColor, textShadow: `0 0 12px ${cardForm.effectColor}` }}
            >
              {cardForm.effectText}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {saving ? '追加中...' : '追加'}
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
