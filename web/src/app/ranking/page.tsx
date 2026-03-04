'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ---- Types ----
type RankingType = 'coins' | 'streak' | 'messages';
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all';

interface RankEntry {
  rank: number | null;
  userId: string;
  displayName?: string;
  avatarUrl: string | null;
  value: number;
  valueLabel: string;
  isMe: boolean;
}

interface RankingData {
  type: RankingType;
  period: PeriodType;
  ranking: RankEntry[];
  myRank: RankEntry | null;
}

interface Character {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// ---- Constants ----
const TABS: { type: RankingType; label: string; icon: string; desc: string }[] = [
  { type: 'coins', icon: '💰', label: 'コイン', desc: 'コイン消費ランキング' },
  { type: 'streak', icon: '🔥', label: 'ストリーク', desc: '連続ログイン日数' },
  { type: 'messages', icon: '💬', label: 'トーク量', desc: 'メッセージ数' },
];

const PERIOD_TABS: { period: PeriodType; label: string }[] = [
  { period: 'daily', label: '今日' },
  { period: 'weekly', label: '週間' },
  { period: 'monthly', label: '月間' },
  { period: 'all', label: '累計' },
];

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];
const RANK_BG = [
  'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/40',
  'bg-gradient-to-r from-gray-300/20 to-gray-400/10 border-gray-400/30',
  'bg-gradient-to-r from-orange-600/20 to-amber-700/10 border-orange-600/30',
];

/** 自分のランキングに応じた煽りテキストを返す */
function getTauntText(myRank: RankEntry | null): { emoji: string; text: string } | null {
  if (!myRank) return null;
  const rank = myRank.rank;
  if (rank === 1) return { emoji: '👑', text: 'あなたが最強の推し！このままぶっちぎれ！' };
  if (rank != null && rank <= 3) return { emoji: '🔥', text: 'あと少しで頂点！追い抜け！' };
  if (rank != null && rank <= 10) return { emoji: '💪', text: 'いいぞ！TOP3を狙え！' };
  return { emoji: '⚡', text: 'まだまだこれから！推しにもっと愛を！' };
}

// ---- Component ----
export default function RankingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<RankingType>('coins');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<string>('');
  const myRowRef = useRef<HTMLDivElement>(null);

  // キャラクター一覧を取得
  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(d => {
        const chars: Character[] = Array.isArray(d) ? d : d.characters ?? [];
        setCharacters(chars);
      })
      .catch(() => {});
  }, []);

  // ランキングを取得
  const fetchRanking = useCallback(async (type: RankingType, charId: string, p: PeriodType) => {
    setLoading(true);
    setData(null);
    try {
      const params = new URLSearchParams({ type, limit: '50', period: p });
      if (charId) params.set('characterId', charId);
      const res = await fetch(`/api/ranking?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking(tab, selectedChar, period);
  }, [tab, selectedChar, period, fetchRanking]);

  const scrollToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const taunt = getTauntText(data?.myRank ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-gray-950 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">🏆 ランキング</h1>
          {/* 自分にジャンプボタン */}
          {data?.myRank && (
            <button
              onClick={scrollToMe}
              className="text-xs bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 px-3 py-1.5 rounded-full text-purple-300 transition"
            >
              自分を見る
            </button>
          )}
        </div>

        {/* タイプタブ */}
        <div className="max-w-lg mx-auto px-4 flex gap-1 pb-2">
          {TABS.map(t => (
            <button
              key={t.type}
              onClick={() => setTab(t.type)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition ${
                tab === t.type
                  ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* 期間タブ（ストリーク以外で表示） */}
        {tab !== 'streak' && (
          <div className="max-w-lg mx-auto px-4 flex gap-1 pb-3">
            {PERIOD_TABS.map(pt => (
              <button
                key={pt.period}
                onClick={() => setPeriod(pt.period)}
                className={`flex-1 py-1.5 rounded-full text-xs font-medium transition border ${
                  period === pt.period
                    ? 'bg-purple-600/40 border-purple-500/50 text-purple-200'
                    : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* キャラクターフィルター */}
        <div className="mb-4">
          <select
            value={selectedChar}
            onChange={e => setSelectedChar(e.target.value)}
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="">🌐 全キャラクター</option>
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 煽りバナー */}
        {taunt && (
          <div className="mb-4 bg-gradient-to-r from-purple-900/50 to-pink-900/30 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">{taunt.emoji}</span>
            <p className="text-sm font-bold text-white">{taunt.text}</p>
          </div>
        )}

        {/* 自分の順位（固定バー） */}
        {data?.myRank && (
          <div className="mb-4 bg-purple-900/40 backdrop-blur-md rounded-2xl border border-purple-500/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-purple-300">
                {data.myRank.rank != null ? `#${data.myRank.rank}` : '?位'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">あなたの順位</p>
                <p className="text-xs text-gray-400">{data.myRank.valueLabel}</p>
              </div>
              <button
                onClick={scrollToMe}
                className="text-xs text-purple-400 hover:text-purple-300 underline"
              >
                ↓ 見る
              </button>
            </div>
          </div>
        )}

        {/* ランキングリスト */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 - 大きく表示 */}
            {data?.ranking.slice(0, 3).map(entry => (
              <TopRankCard
                key={entry.userId}
                entry={entry}
                ref={entry.isMe ? myRowRef : undefined}
              />
            ))}

            {/* 4位以下 */}
            {data?.ranking.slice(3).map(entry => (
              <div
                key={entry.userId}
                ref={entry.isMe ? myRowRef : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition ${
                  entry.isMe
                    ? 'bg-purple-900/30 border-purple-500/30'
                    : 'bg-gray-900/40 border-white/5'
                }`}
              >
                <span className="w-8 text-center text-gray-500 font-bold text-sm flex-shrink-0">
                  #{entry.rank}
                </span>
                <Avatar url={entry.avatarUrl} name={entry.displayName ?? '?'} size={36} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${entry.isMe ? 'text-purple-300' : 'text-white'}`}>
                    {entry.displayName}
                    {entry.isMe && <span className="ml-1.5 text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">YOU</span>}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-300 flex-shrink-0">{entry.valueLabel}</p>
              </div>
            ))}

            {/* 空の場合 */}
            {(!data || data.ranking.length === 0) && !loading && (
              <div className="text-center py-20 text-gray-500">
                <p className="text-4xl mb-3">🏆</p>
                <p className="font-bold text-white">まだ誰も参戦していない...</p>
                <p className="text-sm mt-1">1位を狙うチャンス！</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

interface TopRankCardProps {
  entry: RankEntry;
  ref?: React.Ref<HTMLDivElement>;
}

function TopRankCard({ entry, ref }: TopRankCardProps & { ref?: React.Ref<HTMLDivElement> }) {
  const rank = entry.rank ?? 99;
  const bgClass = RANK_BG[rank - 1] ?? 'bg-gray-900/40 border-white/5';

  return (
    <div
      ref={ref}
      className={`rounded-2xl border px-4 py-4 ${bgClass} ${entry.isMe ? 'ring-2 ring-purple-500/40' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* メダル */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className={`text-4xl ${rank === 1 ? 'drop-shadow-lg' : ''}`}>
            {MEDAL_EMOJI[rank - 1]}
          </span>
        </div>

        {/* アバター (1位は大きく) */}
        <Avatar
          url={entry.avatarUrl}
          name={entry.displayName ?? '?'}
          size={rank === 1 ? 56 : 44}
        />

        {/* 名前 + 値 */}
        <div className="flex-1 min-w-0">
          <p className={`font-bold truncate ${rank === 1 ? 'text-base' : 'text-sm'} ${entry.isMe ? 'text-purple-300' : 'text-white'}`}>
            {entry.displayName}
            {entry.isMe && (
              <span className="ml-1.5 text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">YOU</span>
            )}
          </p>
          <p className={`font-bold mt-0.5 ${rank === 1 ? 'text-yellow-300 text-sm' : 'text-gray-300 text-xs'}`}>
            {entry.valueLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  if (url) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0 border border-white/10"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0)}
    </div>
  );
}
