'use client';

import { useEffect, useState } from 'react';

interface StatsData {
  streak: {
    distribution: { zero: number; one_to_six: number; seven_to_29: number; thirty_plus: number };
    activeStreaks: number;
    maxStreak: number;
    avgStreak: number;
    top10: { userId: string; name: string | null; characterName: string; streak: number }[];
  };
  dailyEvents: {
    today: { type: string; count: number }[];
    past7Days: { date: string; type: string; count: number }[];
    recentSuperRare: { name: string | null; date: string; createdAt: string }[];
  };
  cliffhanger: {
    pendingCount: number;
    consumed24h: number;
    byCharacter: Record<string, number>;
  };
  farewell: {
    recent: { id: string; createdAt: string; userName: string | null; characterName: string; content: string }[];
    byHour: Record<number, number>;
  };
  gacha: {
    activeBanners: {
      id: string;
      name: string;
      characterId: string | null;
      startAt: string;
      endAt: string;
      costCoins: number;
    }[];
    totalPulls: number;
    cardsByRarity: { rarity: string; count: number }[];
  };
  jealousy: {
    avgLevel: number;
    medianLevel: number;
    belowAvg: number;
    aboveAvg: number;
  };
}

interface Character {
  id: string;
  name: string;
}

interface GachaCard {
  id: string;
  name: string;
  rarity: string;
  category: string;
  character: { name: string };
  characterId: string;
  description: string | null;
}

const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'];

const rarityBadge = (r: string) => {
  const map: Record<string, string> = {
    N: 'bg-gray-600 text-white',
    R: 'bg-blue-600 text-white',
    SR: 'bg-purple-600 text-white',
    SSR: 'bg-amber-500 text-black',
    UR: 'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 text-black',
  };
  return map[r] ?? 'bg-gray-700 text-white';
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="text-gray-400 text-sm mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-white mb-4 mt-8">{children}</h2>;
}

export default function AddictionDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<GachaCard[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [rarityFilter, setRarityFilter] = useState('');

  // Banner form
  const [bannerForm, setBannerForm] = useState({
    name: '', characterId: '', startAt: '', endAt: '', costCoins: '100',
  });
  const [bannerMsg, setBannerMsg] = useState('');

  // Card form
  const [cardForm, setCardForm] = useState({
    name: '', description: '', characterId: '', rarity: 'N', category: 'memory',
  });
  const [cardMsg, setCardMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/addiction/stats').then((r) => r.json()),
      fetch('/api/admin/gacha/cards').then((r) => r.json()),
      fetch('/api/admin/characters').then((r) => r.json()).catch(() => []),
    ]).then(([s, c, ch]) => {
      setStats(s);
      setCards(Array.isArray(c) ? c : []);
      setCharacters(Array.isArray(ch) ? ch : []);
      setLoading(false);
    });
  }, []);

  const refreshCards = async () => {
    const url = `/api/admin/gacha/cards${rarityFilter ? `?rarity=${rarityFilter}` : ''}`;
    const c = await fetch(url).then((r) => r.json());
    setCards(Array.isArray(c) ? c : []);
  };

  const createBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/gacha/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bannerForm),
    });
    if (res.ok) {
      setBannerMsg('✅ バナー作成完了');
      setBannerForm({ name: '', characterId: '', startAt: '', endAt: '', costCoins: '100' });
      const s = await fetch('/api/admin/addiction/stats').then((r) => r.json());
      setStats(s);
    } else {
      setBannerMsg('❌ エラー');
    }
  };

  const createCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/gacha/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardForm),
    });
    if (res.ok) {
      setCardMsg('✅ カード作成完了');
      setCardForm({ name: '', description: '', characterId: '', rarity: 'N', category: 'memory' });
      refreshCards();
    } else {
      setCardMsg('❌ エラー');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-lg animate-pulse">読み込み中...</div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-400">データ取得エラー</div>;
  }

  const { streak, dailyEvents, cliffhanger, farewell, gacha, jealousy } = stats;

  // past7Days を日付×タイプで集計
  const datesSet = new Set(dailyEvents.past7Days.map((e) => e.date));
  const dates = Array.from(datesSet).sort();

  return (
    <div className="bg-black text-white min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-2">🧪 中毒設計ダッシュボード</h1>
      <p className="text-gray-500 text-sm mb-8">ストリーク / イベント / ガチャ / 嫉妬メカニクス の管理</p>

      {/* ===== セクション1: ストリーク ===== */}
      <SectionTitle>🔥 ストリーク統計</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="アクティブストリーク" value={streak.activeStreaks} />
        <StatCard label="最長ストリーク" value={`${streak.maxStreak}日`} />
        <StatCard label="平均ストリーク" value={`${streak.avgStreak}日`} />
        <StatCard label="30日+ユーザー" value={streak.distribution.thirty_plus} />
      </div>

      {/* ストリーク分布バー */}
      <div className="bg-gray-900 rounded-xl p-6 mb-4">
        <div className="text-gray-400 text-sm mb-4">ストリーク分布</div>
        {[
          { label: '0日', value: streak.distribution.zero, color: 'bg-gray-600' },
          { label: '1-6日', value: streak.distribution.one_to_six, color: 'bg-blue-600' },
          { label: '7-29日', value: streak.distribution.seven_to_29, color: 'bg-purple-600' },
          { label: '30日+', value: streak.distribution.thirty_plus, color: 'bg-amber-500' },
        ].map(({ label, value, color }) => {
          const total = Object.values(streak.distribution).reduce((a, b) => a + b, 0) || 1;
          const pct = Math.round((value / total) * 100);
          return (
            <div key={label} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{label}</span>
                <span className="text-gray-400">{value} ({pct}%)</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top10 */}
      <div className="bg-gray-900 rounded-xl p-6 mb-4">
        <div className="text-gray-400 text-sm mb-3">上位10ユーザー</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left pb-2">#</th>
              <th className="text-left pb-2">ユーザー</th>
              <th className="text-left pb-2">キャラ</th>
              <th className="text-right pb-2">ストリーク</th>
            </tr>
          </thead>
          <tbody>
            {streak.top10.map((u, i) => (
              <tr key={u.userId + u.characterName} className="border-b border-gray-800/50">
                <td className="py-2 text-gray-500">{i + 1}</td>
                <td className="py-2 text-white">{u.name ?? '(未設定)'}</td>
                <td className="py-2 text-gray-400">{u.characterName}</td>
                <td className="py-2 text-right font-bold text-amber-400">{u.streak}日</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== セクション2: デイリーイベント ===== */}
      <SectionTitle>🎲 デイリーイベント</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['normal', 'good', 'rare', 'super_rare'].map((type) => {
          const ev = dailyEvents.today.find((e) => e.type === type);
          return (
            <div key={type} className="bg-gray-900 rounded-xl p-6">
              <div className="text-gray-400 text-xs mb-1 capitalize">{type.replace('_', ' ')}</div>
              <div className="text-3xl font-bold text-white">{ev?.count ?? 0}</div>
            </div>
          );
        })}
      </div>

      {/* 過去7日グラフ */}
      <div className="bg-gray-900 rounded-xl p-6 mb-4">
        <div className="text-gray-400 text-sm mb-4">過去7日間のイベント分布</div>
        <div className="flex gap-2 overflow-x-auto">
          {dates.map((date) => {
            const dayEvents = dailyEvents.past7Days.filter((e) => e.date === date);
            const total = dayEvents.reduce((a, e) => a + e.count, 0);
            return (
              <div key={date} className="flex flex-col items-center min-w-[60px]">
                <div className="text-xs text-gray-500 mb-1">{date.slice(5)}</div>
                <div className="flex flex-col-reverse h-20 w-8 bg-gray-800 rounded overflow-hidden">
                  {['super_rare', 'rare', 'good', 'normal'].map((t, ti) => {
                    const ev = dayEvents.find((e) => e.type === t);
                    const cnt = ev?.count ?? 0;
                    const pct = total > 0 ? (cnt / total) * 100 : 0;
                    const colors = ['bg-amber-400', 'bg-purple-500', 'bg-blue-500', 'bg-gray-600'];
                    return <div key={t} className={colors[ti]} style={{ height: `${pct}%` }} />;
                  })}
                </div>
                <div className="text-xs text-gray-400 mt-1">{total}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* super_rare users */}
      {dailyEvents.recentSuperRare.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 mb-4">
          <div className="text-gray-400 text-sm mb-3">⭐ 最近 super_rare が出たユーザー</div>
          <div className="space-y-2">
            {dailyEvents.recentSuperRare.map((u, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white">{u.name ?? '(未設定)'}</span>
                <span className="text-gray-500">{u.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== セクション3: クリフハンガー ===== */}
      <SectionTitle>🎣 クリフハンガー</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending設定中" value={cliffhanger.pendingCount} />
        <StatCard label="24h消費" value={cliffhanger.consumed24h} />
        <StatCard label="キャラ別設定" value={Object.keys(cliffhanger.byCharacter).length} />
      </div>
      {Object.keys(cliffhanger.byCharacter).length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 mb-4">
          <div className="text-gray-400 text-sm mb-3">キャラ別クリフハンガー数</div>
          {Object.entries(cliffhanger.byCharacter).map(([char, cnt]) => (
            <div key={char} className="flex justify-between text-sm py-1 border-b border-gray-800/50">
              <span className="text-white">{char}</span>
              <span className="text-purple-400 font-bold">{cnt}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== セクション4: Farewell ===== */}
      <SectionTitle>👋 Farewell ログ</SectionTitle>
      <div className="bg-gray-900 rounded-xl p-6 mb-4">
        <div className="text-gray-400 text-sm mb-3">時間帯別送信数</div>
        <div className="flex gap-1 h-12 items-end">
          {Array.from({ length: 24 }, (_, h) => {
            const cnt = farewell.byHour[h] ?? 0;
            const max = Math.max(1, ...Object.values(farewell.byHour));
            return (
              <div key={h} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-600 rounded-sm"
                  style={{ height: `${(cnt / max) * 100}%`, minHeight: cnt > 0 ? '2px' : '0' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0時</span><span>12時</span><span>23時</span>
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl p-6 mb-4">
        <div className="text-gray-400 text-sm mb-3">直近Farewellログ</div>
        <div className="space-y-2">
          {farewell.recent.length === 0 && <div className="text-gray-600 text-sm">データなし</div>}
          {farewell.recent.map((m) => (
            <div key={m.id} className="text-sm border-b border-gray-800/50 pb-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-white">{m.userName} → {m.characterName}</span>
                <span className="text-gray-500 text-xs">{new Date(m.createdAt).toLocaleString('ja-JP')}</span>
              </div>
              <div className="text-gray-400 text-xs truncate">{m.content}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== セクション5: ガチャ管理 ===== */}
      <SectionTitle>🎰 ガチャ管理</SectionTitle>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="総引き数" value={gacha.totalPulls} />
        <StatCard label="アクティブバナー" value={gacha.activeBanners.length} />
        <StatCard label="カード種類" value={gacha.cardsByRarity.reduce((a, r) => a + r.count, 0)} />
      </div>

      {/* Rarity distribution */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="text-gray-400 text-sm mb-3">レアリティ別カード数</div>
        <div className="flex gap-2 flex-wrap">
          {gacha.cardsByRarity.map((r) => (
            <span key={r.rarity} className={`px-3 py-1 rounded-full text-sm font-bold ${rarityBadge(r.rarity)}`}>
              {r.rarity}: {r.count}
            </span>
          ))}
        </div>
      </div>

      {/* Active banners */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="text-gray-400 text-sm mb-3">アクティブバナー一覧</div>
        {gacha.activeBanners.length === 0 && <div className="text-gray-600 text-sm">バナーなし</div>}
        <div className="space-y-2">
          {gacha.activeBanners.map((b) => (
            <div key={b.id} className="flex flex-wrap justify-between items-center py-2 border-b border-gray-800/50 text-sm">
              <span className="text-white font-semibold">{b.name}</span>
              <span className="text-gray-400">{b.costCoins}コイン</span>
              <span className="text-gray-500 text-xs">
                {new Date(b.startAt).toLocaleDateString('ja-JP')} 〜 {new Date(b.endAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Banner create form */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="text-white font-semibold mb-4">バナー作成</div>
        <form onSubmit={createBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1">バナー名 *</label>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={bannerForm.name}
              onChange={(e) => setBannerForm({ ...bannerForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">キャラクターID</label>
            <select
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={bannerForm.characterId}
              onChange={(e) => setBannerForm({ ...bannerForm, characterId: e.target.value })}
            >
              <option value="">全キャラ混合</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">開始日時 *</label>
            <input
              type="datetime-local"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={bannerForm.startAt}
              onChange={(e) => setBannerForm({ ...bannerForm, startAt: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">終了日時 *</label>
            <input
              type="datetime-local"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={bannerForm.endAt}
              onChange={(e) => setBannerForm({ ...bannerForm, endAt: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">コスト（コイン）</label>
            <input
              type="number"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={bannerForm.costCoins}
              onChange={(e) => setBannerForm({ ...bannerForm, costCoins: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors"
            >
              作成
            </button>
            {bannerMsg && <span className="ml-3 text-sm">{bannerMsg}</span>}
          </div>
        </form>
      </div>

      {/* Card list */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-semibold">カード一覧</div>
          <div className="flex gap-2">
            <select
              className="bg-gray-800 text-white rounded-lg px-3 py-1 text-sm"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
            >
              <option value="">全レアリティ</option>
              {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={refreshCards}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-1 text-sm transition-colors"
            >
              絞り込み
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {cards.length === 0 && <div className="text-gray-600 text-sm">カードなし</div>}
          {cards.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-800/50 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${rarityBadge(c.rarity)}`}>{c.rarity}</span>
              <span className="text-white flex-1">{c.name}</span>
              <span className="text-gray-400">{c.character.name}</span>
              <span className="text-gray-600 text-xs">{c.category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card create form */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="text-white font-semibold mb-4">カード作成</div>
        <form onSubmit={createCard} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1">カード名 *</label>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={cardForm.name}
              onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">キャラクター *</label>
            <select
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={cardForm.characterId}
              onChange={(e) => setCardForm({ ...cardForm, characterId: e.target.value })}
              required
            >
              <option value="">選択してください</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">レアリティ *</label>
            <select
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={cardForm.rarity}
              onChange={(e) => setCardForm({ ...cardForm, rarity: e.target.value })}
            >
              {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">カテゴリ</label>
            <select
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={cardForm.category}
              onChange={(e) => setCardForm({ ...cardForm, category: e.target.value })}
            >
              <option value="memory">memory</option>
              <option value="costume">costume</option>
              <option value="scene">scene</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-gray-400 text-xs block mb-1">説明</label>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              value={cardForm.description}
              onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors"
            >
              作成
            </button>
            {cardMsg && <span className="text-sm">{cardMsg}</span>}
          </div>
        </form>
      </div>

      {/* ===== セクション6: 嫉妬メカニクス ===== */}
      <SectionTitle>💚 嫉妬メカニクス</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="平均レベル" value={jealousy.avgLevel} />
        <StatCard label="中央値レベル" value={jealousy.medianLevel} />
        <StatCard label="嫉妬トリガー対象（平均未満）" value={jealousy.belowAvg} />
        <StatCard label="「お前が一番」対象（平均以上）" value={jealousy.aboveAvg} />
      </div>
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <div className="text-gray-400 text-sm mb-3">メカニクス説明</div>
        <div className="text-sm text-gray-300 space-y-1">
          <p>💚 <span className="text-green-400">嫉妬トリガー</span>: レベルが平均未満のユーザーには「他の子とも話してるの？」系のメッセージが送られる</p>
          <p>⭐ <span className="text-yellow-400">「お前が一番」トリガー</span>: レベルが平均以上のユーザーには特別な承認メッセージが届く</p>
        </div>
      </div>
    </div>
  );
}
