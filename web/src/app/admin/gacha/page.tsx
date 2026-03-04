'use client';

import { useEffect, useState } from 'react';

// ---- Types ----
interface Character { id: string; name: string; avatarUrl: string | null; }
interface GachaBanner {
  id: string;
  name: string;
  description: string | null;
  characterId: string | null;
  isActive: boolean;
  costCoins: number;
  cost10Coins: number | null;
  guaranteedSrAt: number | null;
  franchise: string | null;
  bannerImageUrl: string | null;
  themeColor: string | null;
  animationType: string | null;
  preRollConfig: Record<string, unknown> | null;
  startAt: string;
  endAt: string;
}
interface GachaCard {
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

const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'] as const;
const RARITY_COLOR: Record<string, string> = {
  N: 'bg-gray-700 text-gray-300',
  R: 'bg-blue-800 text-blue-200',
  SR: 'bg-purple-800 text-purple-200',
  SSR: 'bg-yellow-800 text-yellow-200',
  UR: 'bg-pink-800 text-pink-200',
};

const FRANCHISES = ['ONE PIECE', '鬼滅の刃', '呪術廻戦', 'カスタム'] as const;

const ANIMATION_TYPES = [
  { value: 'standard', label: 'スタンダード', desc: '通常の演出' },
  { value: 'fire', label: 'ファイア 🔥', desc: '炎が画面を包む演出' },
  { value: 'flame', label: 'フレイム 🌊', desc: '青白い炎の演出' },
  { value: 'cursed', label: 'カースド ☠️', desc: '呪力が溢れ出す演出' },
  { value: 'golden', label: 'ゴールデン ✨', desc: '黄金の粒子が輝く演出' },
] as const;

const FRAME_TYPES = [
  { value: 'standard', label: 'スタンダード' },
  { value: 'gold', label: 'ゴールド' },
  { value: 'rainbow', label: 'レインボー' },
] as const;

const BANNER_EMPTY = {
  name: '',
  description: '',
  characterId: '',
  startAt: '',
  endAt: '',
  costCoins: '100',
  cost10Coins: '900',
  guaranteedSrAt: '100',
  franchise: '',
  bannerImageUrl: '',
  themeColor: '#6d28d9',
  animationType: 'standard',
  preRollConfig: '',
};
const CARD_EMPTY = {
  name: '',
  description: '',
  characterId: '',
  rarity: 'R',
  category: 'memory',
  franchise: '',
  cardImageUrl: '',
  illustrationUrl: '',
  frameType: 'standard',
  effectColor: '#a855f7',
  effectText: '',
  hasSpecialEffect: false,
};

export default function AdminGachaPage() {
  const [tab, setTab] = useState<'banners' | 'cards'>('banners');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [banners, setBanners] = useState<GachaBanner[]>([]);
  const [cards, setCards] = useState<GachaCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState(BANNER_EMPTY);
  const [preRollJsonError, setPreRollJsonError] = useState('');
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState(CARD_EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [charRes, bannerRes, cardRes] = await Promise.all([
      fetch('/api/admin/characters'),
      fetch('/api/admin/gacha/banners'),
      fetch('/api/admin/gacha/cards'),
    ]);
    setCharacters(await charRes.json().catch(() => []));
    setBanners(await bannerRes.json().catch(() => []));
    setCards(await cardRes.json().catch(() => []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Validate preRollConfig JSON
  const parsePreRollConfig = (): Record<string, unknown> | null => {
    if (!bannerForm.preRollConfig.trim()) return null;
    try {
      const parsed = JSON.parse(bannerForm.preRollConfig);
      setPreRollJsonError('');
      return parsed as Record<string, unknown>;
    } catch {
      setPreRollJsonError('JSONフォーマットエラー');
      return undefined as unknown as null;
    }
  };

  // ---- Banner actions ----
  const createBanner = async () => {
    setError('');
    if (!bannerForm.name || !bannerForm.startAt || !bannerForm.endAt) {
      setError('バナー名・開始日・終了日は必須です');
      return;
    }
    const preRollConfig = parsePreRollConfig();
    if (preRollJsonError) return;

    setSaving(true);
    const r = await fetch('/api/admin/gacha/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: bannerForm.name,
        description: bannerForm.description || null,
        characterId: bannerForm.characterId || null,
        startAt: bannerForm.startAt,
        endAt: bannerForm.endAt,
        costCoins: Number(bannerForm.costCoins) || 100,
        cost10Coins: Number(bannerForm.cost10Coins) || 900,
        guaranteedSrAt: Number(bannerForm.guaranteedSrAt) || 100,
        franchise: bannerForm.franchise || null,
        bannerImageUrl: bannerForm.bannerImageUrl || null,
        themeColor: bannerForm.themeColor || null,
        animationType: bannerForm.animationType || 'standard',
        preRollConfig,
      }),
    });
    setSaving(false);
    if (!r.ok) { setError('作成失敗'); return; }
    setShowBannerForm(false);
    setBannerForm(BANNER_EMPTY);
    load();
  };

  const toggleBanner = async (id: string, current: boolean) => {
    await fetch(`/api/admin/gacha/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    load();
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('このバナーを削除しますか？')) return;
    await fetch(`/api/admin/gacha/banners/${id}`, { method: 'DELETE' });
    load();
  };

  // ---- Card actions ----
  const createCard = async () => {
    setError('');
    if (!cardForm.name || !cardForm.characterId || !cardForm.rarity) {
      setError('カード名・キャラ・レアリティは必須です');
      return;
    }
    setSaving(true);
    const r = await fetch('/api/admin/gacha/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cardForm.name,
        description: cardForm.description || null,
        characterId: cardForm.characterId,
        rarity: cardForm.rarity,
        category: cardForm.category,
        franchise: cardForm.franchise || null,
        cardImageUrl: cardForm.cardImageUrl || null,
        illustrationUrl: cardForm.illustrationUrl || null,
        frameType: cardForm.frameType || 'standard',
        effect: {
          effectColor: cardForm.effectColor || '#a855f7',
          effectText: cardForm.effectText || null,
          hasSpecialEffect: cardForm.hasSpecialEffect,
        },
      }),
    });
    setSaving(false);
    if (!r.ok) { setError('作成失敗'); return; }
    setShowCardForm(false);
    setCardForm(CARD_EMPTY);
    load();
  };

  const charName = (id: string) => characters.find(c => c.id === id)?.name ?? id;

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-6">🎰 ガチャ管理</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['banners', 'cards'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-b-2 border-purple-400 text-purple-300'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'banners' ? `📋 バナー (${banners.length})` : `🃏 カード (${cards.length})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400">読み込み中...</p>}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* ---- Banners Tab ---- */}
      {tab === 'banners' && !loading && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">アクティブなバナーがユーザーのガチャ画面に表示されます。</p>
            <button
              onClick={() => setShowBannerForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
            >
              + バナー作成
            </button>
          </div>

          {/* Banner form */}
          {showBannerForm && (
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
                  onClick={createBanner}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {saving ? '作成中...' : '作成'}
                </button>
                <button
                  onClick={() => { setShowBannerForm(false); setError(''); setPreRollJsonError(''); }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* Banner list */}
          <div className="space-y-3">
            {banners.length === 0 && <p className="text-gray-500 text-sm">バナーなし</p>}
            {banners.map((b) => (
              <div key={b.id} className={`rounded-lg p-4 border flex justify-between items-start ${
                b.isActive ? 'bg-gray-800 border-purple-700' : 'bg-gray-900 border-gray-700 opacity-60'
              }`}
                style={b.themeColor ? { borderLeftColor: b.themeColor, borderLeftWidth: '4px' } : {}}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{b.name}</span>
                    {b.franchise && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-200">
                        {b.franchise}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.isActive ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {b.isActive ? 'アクティブ' : '停止中'}
                    </span>
                    <span className="text-xs text-yellow-400">💰 {b.costCoins}コイン</span>
                    {b.cost10Coins && (
                      <span className="text-xs text-yellow-300">10連: {b.cost10Coins}コイン</span>
                    )}
                    {b.animationType && b.animationType !== 'standard' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                        {ANIMATION_TYPES.find(a => a.value === b.animationType)?.label ?? b.animationType}
                      </span>
                    )}
                  </div>
                  {b.description && <p className="text-gray-400 text-sm mb-1">{b.description}</p>}
                  {b.characterId && (
                    <p className="text-gray-500 text-xs">キャラ: {charName(b.characterId)}</p>
                  )}
                  {b.guaranteedSrAt && (
                    <p className="text-gray-500 text-xs">SR天井: {b.guaranteedSrAt}連</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(b.startAt).toLocaleDateString('ja-JP')} 〜 {new Date(b.endAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {b.themeColor && (
                    <div
                      className="w-5 h-5 rounded-full border border-gray-600"
                      style={{ backgroundColor: b.themeColor }}
                      title={b.themeColor}
                    />
                  )}
                  <button
                    onClick={() => toggleBanner(b.id, b.isActive)}
                    className={`text-xs px-3 py-1 rounded ${
                      b.isActive
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-green-700 hover:bg-green-600 text-white'
                    }`}
                  >
                    {b.isActive ? '停止' : '有効化'}
                  </button>
                  <button
                    onClick={() => deleteBanner(b.id)}
                    className="text-xs px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-red-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Cards Tab ---- */}
      {tab === 'cards' && !loading && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">全カード一覧。バナーの引き確率はレアリティに基づいて自動計算されます。</p>
            <button
              onClick={() => setShowCardForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
            >
              + カード追加
            </button>
          </div>

          {/* Card form */}
          {showCardForm && (
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
                  {/* プレビュー */}
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
                  onClick={createCard}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {saving ? '追加中...' : '追加'}
                </button>
                <button
                  onClick={() => { setShowCardForm(false); setError(''); }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* Cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cards.length === 0 && <p className="text-gray-500 text-sm col-span-full">カードなし</p>}
            {cards.map((c) => (
              <div key={c.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${RARITY_COLOR[c.rarity] ?? 'bg-gray-700 text-gray-300'}`}>
                    {c.rarity}
                  </span>
                  <span className="text-gray-400 text-xs">{c.category}</span>
                  {c.frameType && c.frameType !== 'standard' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300">
                      {FRAME_TYPES.find(f => f.value === c.frameType)?.label}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{c.character?.name ?? charName(c.characterId)}</p>
                {c.franchise && (
                  <p className="text-indigo-400 text-xs mt-0.5">{c.franchise}</p>
                )}
                {c.cardImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cardImageUrl}
                    alt={c.name}
                    className="w-full h-20 object-cover rounded mt-2"
                  />
                )}
                {c.description && (
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{c.description}</p>
                )}
                {/* 演出設定バッジ */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {c.effect?.effectText && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{
                        color: (c.effect?.effectColor as string) ?? '#a855f7',
                        backgroundColor: `${(c.effect?.effectColor as string) ?? '#a855f7'}20`,
                        border: `1px solid ${(c.effect?.effectColor as string) ?? '#a855f7'}40`,
                      }}
                    >
                      {c.effect.effectText}
                    </span>
                  )}
                  {c.effect?.hasSpecialEffect && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/30 font-bold">
                      💥 画面割れ
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
