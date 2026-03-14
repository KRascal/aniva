'use client';

import { Dispatch, SetStateAction } from 'react';

interface Character { id: string; name: string; avatarUrl: string | null; }

export const FRANCHISES = ['ONE PIECE', '鬼滅の刃', '呪術廻戦', 'カスタム'] as const;

export const ANIMATION_TYPES = [
  { value: 'standard', label: 'スタンダード', desc: '通常の演出' },
  { value: 'fire',     label: 'ファイア 🔥',    desc: '炎が画面を包む演出' },
  { value: 'flame',    label: 'フレイム 🌊',    desc: '青白い炎の演出' },
  { value: 'cursed',   label: 'カースド ☠️',    desc: '呪力が溢れ出す演出' },
  { value: 'golden',   label: 'ゴールデン ✨',  desc: '黄金の粒子が輝く演出' },
] as const;

export interface BannerFormState {
  name: string;
  description: string;
  characterId: string;
  startAt: string;
  endAt: string;
  costCoins: string;
  cost10Coins: string;
  guaranteedSrAt: string;
  franchise: string;
  bannerImageUrl: string;
  themeColor: string;
  animationType: string;
  preRollConfig: string;
}

interface Props {
  characters: Character[];
  bannerForm: BannerFormState;
  setBannerForm: Dispatch<SetStateAction<BannerFormState>>;
  preRollJsonError: string;
  setPreRollJsonError: Dispatch<SetStateAction<string>>;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function GachaBannerForm({
  characters,
  bannerForm,
  setBannerForm,
  preRollJsonError,
  setPreRollJsonError,
  saving,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-purple-700">
      <h3 className="font-semibold mb-3">新規バナー</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">

        {/* バナー名 */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">バナー名 *</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="例: 麦わらの一味 春ガチャ"
            value={bannerForm.name}
            onChange={(e) => setBannerForm({ ...bannerForm, name: e.target.value })}
          />
        </div>

        {/* 説明 */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">説明</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="任意の説明文"
            value={bannerForm.description}
            onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
          />
        </div>

        {/* フランチャイズ */}
        <div>
          <label className="text-gray-400 block mb-1">フランチャイズ</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.franchise}
            onChange={(e) => setBannerForm({ ...bannerForm, franchise: e.target.value })}
          >
            <option value="">選択なし</option>
            {FRANCHISES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* 特定キャラ */}
        <div>
          <label className="text-gray-400 block mb-1">特定キャラ (任意)</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.characterId}
            onChange={(e) => setBannerForm({ ...bannerForm, characterId: e.target.value })}
          >
            <option value="">全キャラ共通</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* テーマカラー */}
        <div>
          <label className="text-gray-400 block mb-1">テーマカラー</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="w-12 h-10 rounded cursor-pointer bg-transparent border border-gray-600"
              value={bannerForm.themeColor}
              onChange={(e) => setBannerForm({ ...bannerForm, themeColor: e.target.value })}
            />
            <input
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-white font-mono text-sm"
              value={bannerForm.themeColor}
              onChange={(e) => setBannerForm({ ...bannerForm, themeColor: e.target.value })}
              placeholder="#6d28d9"
            />
          </div>
        </div>

        {/* 演出タイプ */}
        <div>
          <label className="text-gray-400 block mb-1">演出タイプ</label>
          <select
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.animationType}
            onChange={(e) => setBannerForm({ ...bannerForm, animationType: e.target.value })}
          >
            {ANIMATION_TYPES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          {bannerForm.animationType && (
            <p className="text-gray-500 text-xs mt-1">
              {ANIMATION_TYPES.find(a => a.value === bannerForm.animationType)?.desc}
            </p>
          )}
        </div>

        {/* バナー画像URL */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">バナー画像URL</label>
          <input
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="https://example.com/banner.jpg"
            value={bannerForm.bannerImageUrl}
            onChange={(e) => setBannerForm({ ...bannerForm, bannerImageUrl: e.target.value })}
          />
        </div>

        {/* コスト */}
        <div>
          <label className="text-gray-400 block mb-1">1回コスト (コイン)</label>
          <input
            type="number"
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.costCoins}
            onChange={(e) => setBannerForm({ ...bannerForm, costCoins: e.target.value })}
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-1">10連コスト (コイン)</label>
          <input
            type="number"
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.cost10Coins}
            onChange={(e) => setBannerForm({ ...bannerForm, cost10Coins: e.target.value })}
          />
        </div>

        {/* SR天井 */}
        <div>
          <label className="text-gray-400 block mb-1">SR天井（何連目でSR確定）</label>
          <input
            type="number"
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.guaranteedSrAt}
            onChange={(e) => setBannerForm({ ...bannerForm, guaranteedSrAt: e.target.value })}
          />
        </div>

        {/* 開始・終了日 */}
        <div>
          <label className="text-gray-400 block mb-1">開始日時 *</label>
          <input
            type="datetime-local"
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.startAt}
            onChange={(e) => setBannerForm({ ...bannerForm, startAt: e.target.value })}
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-1">終了日時 *</label>
          <input
            type="datetime-local"
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            value={bannerForm.endAt}
            onChange={(e) => setBannerForm({ ...bannerForm, endAt: e.target.value })}
          />
        </div>

        {/* 事前演出設定 (JSON) */}
        <div className="col-span-2">
          <label className="text-gray-400 block mb-1">事前演出設定 (JSON)</label>
          <textarea
            className="w-full bg-gray-700 rounded px-3 py-2 text-white font-mono text-xs"
            rows={4}
            placeholder='{"intro": "アニメ名", "bgm": "theme.mp3"}'
            value={bannerForm.preRollConfig}
            onChange={(e) => {
              setBannerForm({ ...bannerForm, preRollConfig: e.target.value });
              setPreRollJsonError('');
            }}
          />
          {preRollJsonError && (
            <p className="text-red-400 text-xs mt-1">{preRollJsonError}</p>
          )}
          {bannerForm.preRollConfig && !preRollJsonError && (() => {
            try {
              JSON.parse(bannerForm.preRollConfig);
              return <p className="text-green-500 text-xs mt-1">✓ 有効なJSON</p>;
            } catch {
              return null;
            }
          })()}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {saving ? '作成中...' : '作成'}
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
