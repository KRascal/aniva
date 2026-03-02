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

const BANNER_EMPTY = {
  name: '',
  description: '',
  characterId: '',
  startAt: '',
  endAt: '',
  costCoins: '100',
};
const CARD_EMPTY = {
  name: '',
  description: '',
  characterId: '',
  rarity: 'R',
  category: 'memory',
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

  // ---- Banner actions ----
  const createBanner = async () => {
    setError('');
    if (!bannerForm.name || !bannerForm.startAt || !bannerForm.endAt) {
      setError('バナー名・開始日・終了日は必須です');
      return;
    }
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
      body: JSON.stringify(cardForm),
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
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">バナー名 *</label>
                  <input
                    className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                    placeholder="例: 麦わらの一味 春ガチャ"
                    value={bannerForm.name}
                    onChange={(e) => setBannerForm({ ...bannerForm, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">説明</label>
                  <input
                    className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                    placeholder="任意の説明文"
                    value={bannerForm.description}
                    onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                  />
                </div>
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
                <div>
                  <label className="text-gray-400 block mb-1">コスト (コイン)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                    value={bannerForm.costCoins}
                    onChange={(e) => setBannerForm({ ...bannerForm, costCoins: e.target.value })}
                  />
                </div>
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
                  onClick={() => { setShowBannerForm(false); setError(''); }}
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
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{b.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.isActive ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {b.isActive ? 'アクティブ' : '停止中'}
                    </span>
                    <span className="text-xs text-yellow-400">💰 {b.costCoins}コイン</span>
                  </div>
                  {b.description && <p className="text-gray-400 text-sm mb-1">{b.description}</p>}
                  {b.characterId && (
                    <p className="text-gray-500 text-xs">キャラ: {charName(b.characterId)}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(b.startAt).toLocaleDateString('ja-JP')} 〜 {new Date(b.endAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
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
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">カード名 *</label>
                  <input
                    className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                    placeholder="例: ルフィ 熱き宣言"
                    value={cardForm.name}
                    onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">説明</label>
                  <input
                    className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                    placeholder="カードの説明文"
                    value={cardForm.description}
                    onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  />
                </div>
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
                </div>
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{c.character?.name ?? charName(c.characterId)}</p>
                {c.description && (
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{c.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
