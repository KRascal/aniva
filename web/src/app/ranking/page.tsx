'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ---- Types ----
type MainTab = 'users' | 'characters';
type RankingType = 'coins' | 'streak' | 'messages';
type CharRankingType = 'coins' | 'messages';
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

interface CharRankEntry {
  rank: number;
  characterId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  value: number;
  valueLabel: string;
}

interface CharRankingData {
  type: string;
  period: string;
  ranking: CharRankEntry[];
}

interface Character {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// ---- Constants ----
const USER_TABS: { type: RankingType; label: string; icon: string; desc: string }[] = [
  { type: 'coins', icon: '❤️‍🔥', label: '推し貢献度', desc: '推しに使ったコイン数で競う' },
  { type: 'streak', icon: '🔥', label: '連続ログイン', desc: '毎日ログインした連続日数' },
  { type: 'messages', icon: '💬', label: 'トーク数', desc: '推しに送ったメッセージ数' },
];

const CHAR_TABS: { type: CharRankingType; label: string; icon: string; desc: string }[] = [
  { type: 'coins', icon: '❤️‍🔥', label: '推し貢献度', desc: '推しに使われたコイン総額' },
  { type: 'messages', icon: '💬', label: 'トーク数', desc: '推しへの総メッセージ数' },
];

const PERIOD_TABS: { period: PeriodType; label: string }[] = [
  { period: 'daily', label: '今日' },
  { period: 'weekly', label: '週間' },
  { period: 'monthly', label: '月間' },
  { period: 'all', label: '累計' },
];

const CHAR_PERIOD_TABS: { period: PeriodType; label: string }[] = [
  { period: 'daily', label: '今日' },
  { period: 'weekly', label: '週間' },
  { period: 'monthly', label: '月間' },
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
  const [mainTab, setMainTab] = useState<MainTab>('users');

  // ユーザーランキング state
  const [tab, setTab] = useState<RankingType>('coins');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<string>('');
  const myRowRef = useRef<HTMLDivElement>(null);

  // キャラクターランキング state
  const [charTab, setCharTab] = useState<CharRankingType>('coins');
  const [charPeriod, setCharPeriod] = useState<PeriodType>('weekly');
  const [charData, setCharData] = useState<CharRankingData | null>(null);
  const [charLoading, setCharLoading] = useState(false);

  // フォロー中キャラクター一覧を取得
  useEffect(() => {
    fetch('/api/characters?followingOnly=true')
      .then(r => r.json())
      .then(d => {
        const chars: Character[] = Array.isArray(d) ? d : d.characters ?? [];
        setCharacters(chars);
      })
      .catch(() => {});
  }, []);

  // ユーザーランキングを取得
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

  // キャラクターランキングを取得
  const fetchCharRanking = useCallback(async (type: CharRankingType, p: PeriodType) => {
    setCharLoading(true);
    setCharData(null);
    try {
      const params = new URLSearchParams({ type, limit: '50', period: p });
      const res = await fetch(`/api/ranking/characters?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCharData(json);
      }
    } catch {
      // ignore
    } finally {
      setCharLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'users') {
      fetchRanking(tab, selectedChar, period);
    }
  }, [mainTab, tab, selectedChar, period, fetchRanking]);

  useEffect(() => {
    if (mainTab === 'characters') {
      fetchCharRanking(charTab, charPeriod);
    }
  }, [mainTab, charTab, charPeriod, fetchCharRanking]);

  const scrollToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const taunt = getTauntText(data?.myRank ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white pb-24">
      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-gray-950 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">🏆 ランキング</h1>
          {/* 自分にジャンプボタン（ユーザーランキングのみ） */}
          {mainTab === 'users' && data?.myRank && (
            <button
              onClick={scrollToMe}
              className="text-xs bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 px-3 py-1.5 rounded-full text-purple-300 transition"
            >
              自分を見る
            </button>
          )}
        </div>

        {/* メインタブ（ユーザー / キャラクター） */}
        <div className="max-w-lg mx-auto px-4 flex gap-1 pb-2">
          <button
            onClick={() => setMainTab('users')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition border ${
              mainTab === 'users'
                ? 'bg-purple-600/30 border-purple-500/40 text-purple-200'
                : 'border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            👤 ユーザーランキング
          </button>
          <button
            onClick={() => setMainTab('characters')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition border ${
              mainTab === 'characters'
                ? 'bg-pink-600/30 border-pink-500/40 text-pink-200'
                : 'border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            ⭐ キャラランキング
          </button>
        </div>

        {/* ---- ユーザーランキングのサブタブ ---- */}
        {mainTab === 'users' && (
          <>
            {/* タイプタブ */}
            <div className="max-w-lg mx-auto px-4 flex gap-2 pb-2">
              {USER_TABS.map(t => (
                <button
                  key={t.type}
                  onClick={() => setTab(t.type)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition border ${
                    tab === t.type
                      ? 'bg-purple-600/30 border-purple-500/40 text-white'
                      : 'border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-xs font-bold">{t.label}</span>
                  <span className={`text-xs leading-tight text-center ${tab === t.type ? 'text-purple-300' : 'text-gray-600'}`}>{t.desc}</span>
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
          </>
        )}

        {/* ---- キャラクターランキングのサブタブ ---- */}
        {mainTab === 'characters' && (
          <>
            <div className="max-w-lg mx-auto px-4 flex gap-2 pb-2">
              {CHAR_TABS.map(t => (
                <button
                  key={t.type}
                  onClick={() => setCharTab(t.type)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition border ${
                    charTab === t.type
                      ? 'bg-pink-600/30 border-pink-500/40 text-white'
                      : 'border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-xs font-bold">{t.label}</span>
                  <span className={`text-xs leading-tight text-center ${charTab === t.type ? 'text-pink-300' : 'text-gray-600'}`}>{t.desc}</span>
                </button>
              ))}
            </div>

            <div className="max-w-lg mx-auto px-4 flex gap-1 pb-3">
              {CHAR_PERIOD_TABS.map(pt => (
                <button
                  key={pt.period}
                  onClick={() => setCharPeriod(pt.period)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium transition border ${
                    charPeriod === pt.period
                      ? 'bg-pink-600/40 border-pink-500/50 text-pink-200'
                      : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* ======== ユーザーランキング ======== */}
        {mainTab === 'users' && (
          <>
            {/* キャラクターフィルター（フォロー中のみ） */}
            {characters.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedChar('')}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs transition ${
                      selectedChar === ''
                        ? 'bg-purple-600/30 border-purple-500/40 text-purple-300'
                        : 'bg-gray-900/50 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base">🌐</span>
                    <span className="whitespace-nowrap text-xs">全員</span>
                  </button>
                  {characters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChar(c.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-xs transition ${
                        selectedChar === c.id
                          ? 'bg-purple-600/30 border-purple-500/40 text-purple-300'
                          : 'bg-gray-900/50 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold">
                          {c.name.charAt(0)}
                        </span>
                      )}
                      <span className="whitespace-nowrap max-w-[4rem] truncate">{c.name.split('・').pop() ?? c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 煽りバナー */}
            {taunt && (
              <div className="mb-4 bg-gradient-to-r from-purple-900/50 to-pink-900/30 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{taunt.emoji}</span>
                <p className="text-sm font-bold text-white">{taunt.text}</p>
              </div>
            )}

            {/* 自分の順位（固定バー） */}
            {data?.myRank && (() => {
              const myRank = data.myRank;
              const rank = myRank.rank ?? 999;
              const aboveEntry = rank > 1 ? data.ranking.find(r => r.rank === rank - 1) : null;
              const diff = aboveEntry ? aboveEntry.value - myRank.value : 0;
              return (
                <div className="mb-4 bg-purple-900/40 backdrop-blur-md rounded-2xl border border-purple-500/30 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-purple-300">
                      {rank < 999 ? `#${rank}` : '圏外'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">あなたの順位</p>
                      <p className="text-xs text-gray-400">{myRank.valueLabel}</p>
                    </div>
                    <button onClick={scrollToMe} className="text-xs text-purple-400 hover:text-purple-300 underline">
                      ↓ 見る
                    </button>
                  </div>
                  {aboveEntry && diff > 0 && tab === 'coins' && (
                    <a href="/coins" className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2 hover:bg-red-900/50 transition">
                      <span className="text-base">😤</span>
                      <p className="text-xs text-red-300 flex-1">
                        <span className="font-bold">{aboveEntry.displayName}</span> に勝つには あと <span className="font-black text-yellow-400">{diff.toLocaleString()}コイン</span>
                      </p>
                      <span className="text-[10px] text-red-400">→ 補充</span>
                    </a>
                  )}
                  {aboveEntry && tab === 'messages' && (
                    <a href="/chat" className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-xl px-3 py-2 hover:bg-blue-900/50 transition">
                      <span className="text-base">💬</span>
                      <p className="text-xs text-blue-300 flex-1">
                        <span className="font-bold">{aboveEntry.displayName}</span> に勝つには あと <span className="font-black text-white">{diff.toLocaleString()}通</span>
                      </p>
                      <span className="text-[10px] text-blue-400">→ 話しかける</span>
                    </a>
                  )}
                </div>
              );
            })()}

            {/* ユーザーランキングリスト */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {data?.ranking.slice(0, 3).map(entry => (
                  <TopRankCard key={entry.userId} entry={entry} ref={entry.isMe ? myRowRef : undefined} />
                ))}
                {data?.ranking.slice(3).map(entry => (
                  <div
                    key={entry.userId}
                    ref={entry.isMe ? myRowRef : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition ${
                      entry.isMe ? 'bg-purple-900/30 border-purple-500/30' : 'bg-gray-900/40 border-white/5'
                    }`}
                  >
                    <span className="w-8 text-center text-gray-500 font-bold text-sm flex-shrink-0">#{entry.rank}</span>
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
                {(!data || data.ranking.length === 0) && !loading && (
                  <EmptyState tab={tab} />
                )}
              </div>
            )}
          </>
        )}

        {/* ======== キャラクターランキング ======== */}
        {mainTab === 'characters' && (
          <>
            {charLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {charData?.ranking.slice(0, 3).map(entry => (
                  <CharTopRankCard key={entry.characterId} entry={entry} onClick={() => router.push(`/ranking/${entry.characterId}`)} />
                ))}
                {charData?.ranking.slice(3).map(entry => (
                  <div
                    key={entry.characterId}
                    onClick={() => router.push(`/ranking/${entry.characterId}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-gray-900/40 border-white/5 cursor-pointer hover:border-pink-500/30 transition"
                  >
                    <span className="w-8 text-center text-gray-500 font-bold text-sm flex-shrink-0">#{entry.rank}</span>
                    <Avatar url={entry.avatarUrl} name={entry.name} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-white">{entry.name.split('・').pop() ?? entry.name}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-300 flex-shrink-0">{entry.valueLabel}</p>
                  </div>
                ))}
                {(!charData || charData.ranking.length === 0) && !charLoading && (
                  <div className="text-center py-16 px-6">
                    <div className="text-5xl mb-4">⭐</div>
                    <p className="font-bold text-white text-lg mb-2">まだデータがありません</p>
                    <p className="text-sm text-gray-400 mb-6">
                      {charTab === 'coins' ? '推しにコインを贈ると、キャラの人気ランキングに反映されます！' : '推しにたくさんトークすると、キャラの人気ランキングに反映されます！'}
                    </p>
                    <a
                      href="/chat"
                      className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
                    >
                      <span>💬</span>
                      推しとトークする
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function EmptyState({ tab }: { tab: RankingType }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">🏆</div>
      <p className="font-bold text-white text-lg mb-2">まだ誰も参戦していない</p>
      <p className="text-sm text-gray-400 mb-6">
        {tab === 'coins' && 'コインを使って推しに貢献すると、ここにランクイン！'}
        {tab === 'streak' && '毎日ログインして連続記録を伸ばそう！'}
        {tab === 'messages' && '推しにたくさんメッセージを送って1位を目指そう！'}
      </p>
      <a
        href="/chat"
        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
      >
        <span>💬</span>
        推しとトークする
      </a>
    </div>
  );
}

const RANK_TITLES = [
  { rank: 1, title: '覇王', color: 'text-yellow-300', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  { rank: 2, title: '四皇', color: 'text-gray-300', bg: 'bg-gray-400/20 border-gray-400/40' },
  { rank: 3, title: '大将', color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/40' },
];

interface TopRankCardProps {
  entry: RankEntry;
  ref?: React.Ref<HTMLDivElement>;
}

function TopRankCard({ entry, ref }: TopRankCardProps) {
  const rank = entry.rank ?? 99;
  const bgClass = RANK_BG[rank - 1] ?? 'bg-gray-900/40 border-white/5';
  const rankTitle = RANK_TITLES.find(t => t.rank === rank);

  return (
    <div
      ref={ref}
      className={`rounded-2xl border px-4 py-4 ${bgClass} ${entry.isMe ? 'ring-2 ring-purple-500/40' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center flex-shrink-0">
          <span className={`text-4xl ${rank === 1 ? 'drop-shadow-lg' : ''}`}>
            {MEDAL_EMOJI[rank - 1]}
          </span>
          {rankTitle && (
            <span className={`text-xs font-black mt-0.5 px-1.5 py-0.5 rounded-full border ${rankTitle.bg} ${rankTitle.color}`}>
              {rankTitle.title}
            </span>
          )}
        </div>
        <Avatar url={entry.avatarUrl} name={entry.displayName ?? '?'} size={rank === 1 ? 56 : 44} />
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

const CHAR_RANK_TITLES = [
  { rank: 1, title: '覇王', color: 'text-yellow-300', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  { rank: 2, title: '四皇', color: 'text-gray-300', bg: 'bg-gray-400/20 border-gray-400/40' },
  { rank: 3, title: '大将', color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/40' },
];

function CharTopRankCard({ entry, onClick }: { entry: CharRankEntry; onClick: () => void }) {
  const rank = entry.rank;
  const bgClass = RANK_BG[rank - 1] ?? 'bg-gray-900/40 border-white/5';
  const rankTitle = CHAR_RANK_TITLES.find(t => t.rank === rank);

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 ${bgClass} cursor-pointer hover:opacity-90 transition`}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center flex-shrink-0">
          <span className={`text-4xl ${rank === 1 ? 'drop-shadow-lg' : ''}`}>
            {MEDAL_EMOJI[rank - 1]}
          </span>
          {rankTitle && (
            <span className={`text-xs font-black mt-0.5 px-1.5 py-0.5 rounded-full border ${rankTitle.bg} ${rankTitle.color}`}>
              {rankTitle.title}
            </span>
          )}
        </div>
        <Avatar url={entry.avatarUrl} name={entry.name} size={rank === 1 ? 56 : 44} />
        <div className="flex-1 min-w-0">
          <p className={`font-bold truncate ${rank === 1 ? 'text-base' : 'text-sm'} text-white`}>
            {entry.name.split('・').pop() ?? entry.name}
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
