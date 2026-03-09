'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type PeriodType = 'weekly' | 'monthly' | 'alltime';

interface RankEntry {
  rank: number;
  userId: string;
  totalScore: number;
  chatScore: number;
  callScore: number;
  giftScore: number;
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    nickname: string | null;
    image: string | null;
  };
  character?: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
  };
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  weekly: '週間',
  monthly: '月間',
  alltime: '累計',
};

const CROWN = ['👑', '🥈', '🥉'];

export default function RankingPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [characters, setCharacters] = useState<{ id: string; name: string; slug: string; avatarUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (characterId) params.set('characterId', characterId);
    const res = await fetch(`/api/ranking?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRankings(data.rankings ?? []);
    }
    setLoading(false);
  }, [period, characterId]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(d => setCharacters(d.characters ?? []))
      .catch(() => {});
  }, []);

  const getUserName = (user: RankEntry['user']) =>
    user.displayName || user.nickname || user.name || 'ユーザー';

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-white">🏆 ランキング</h1>
          </div>
        </div>
      </header>

      {/* 期間切替 */}
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex gap-2 bg-gray-900/60 rounded-2xl p-1">
          {(['weekly', 'monthly', 'alltime'] as PeriodType[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                period === p
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* キャラフィルター */}
      <div className="max-w-lg mx-auto px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setCharacterId(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !characterId ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            全体
          </button>
          {characters.slice(0, 12).map(c => (
            <button
              key={c.id}
              onClick={() => setCharacterId(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                characterId === c.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {c.avatarUrl && (
                <Image src={c.avatarUrl} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" unoptimized />
              )}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ランキングリスト */}
      <div className="max-w-lg mx-auto px-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="aniva-shimmer w-10 h-10 rounded-full bg-gray-700" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏆</p>
            <p className="text-gray-400 text-sm">まだランキングデータがありません</p>
            <p className="text-gray-600 text-xs mt-1">チャットやギフティングでスコアを獲得しよう</p>
          </div>
        ) : (
          rankings.map((entry) => (
            <div
              key={`${entry.userId}-${entry.character?.id ?? 'all'}`}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                entry.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/10 border border-yellow-500/20'
                  : 'bg-gray-900/40 border border-white/5'
              }`}
            >
              {/* 順位 */}
              <div className="w-8 text-center flex-shrink-0">
                {entry.rank <= 3 ? (
                  <span className="text-xl">{CROWN[entry.rank - 1]}</span>
                ) : (
                  <span className="text-sm font-bold text-gray-500">{entry.rank}</span>
                )}
              </div>

              {/* アバター */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                {entry.user.image ? (
                  <Image src={entry.user.image} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-purple-600 to-pink-600">
                    {getUserName(entry.user).charAt(0)}
                  </div>
                )}
              </div>

              {/* ユーザー名 + スコア内訳 */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{getUserName(entry.user)}</p>
                <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                  {entry.chatScore > 0 && <span>💬{entry.chatScore}</span>}
                  {entry.callScore > 0 && <span>📞{entry.callScore}</span>}
                  {entry.giftScore > 0 && <span>🎁{entry.giftScore}</span>}
                </div>
              </div>

              {/* トータルスコア */}
              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-sm ${entry.rank <= 3 ? 'text-yellow-400' : 'text-purple-400'}`}>
                  {entry.totalScore.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-600">pt</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
