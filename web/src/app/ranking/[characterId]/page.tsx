'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface RankEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  totalMessages: number;
  giftCoins: number;
  isFanclub: boolean;
  score: number;
  isMe: boolean;
}

interface RankingData {
  characterId: string;
  ranking: RankEntry[];
  myRank: RankEntry | null;
  totalFans: number;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [
  'from-yellow-500/20 to-amber-500/10 border-yellow-500/40',
  'from-gray-300/20 to-gray-400/10 border-gray-400/30',
  'from-orange-600/20 to-amber-700/10 border-orange-600/30',
];

export default function RankingPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const router = useRouter();
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [charName, setCharName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/ranking/${characterId}`).then(r => r.json()),
      fetch(`/api/characters/${characterId}`).then(r => r.json()).catch(() => null),
    ]).then(([rankData, charData]) => {
      setData(rankData);
      setCharName(charData?.name || charData?.character?.name || 'キャラクター');
    }).finally(() => setLoading(false));
  }, [characterId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-purple-400 text-lg">ランキング読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-black text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            ← 
          </button>
          <div>
            <h1 className="font-bold text-sm">🏆 {charName} 推し度ランキング</h1>
            <p className="text-gray-500 text-xs">{data?.totalFans ?? 0}人のファン</p>
          </div>
        </div>
      </div>

      {/* 自分の順位（固定バー） */}
      {data?.myRank && (
        <div className="sticky top-[53px] z-10 mx-4 mt-3 bg-purple-900/40 backdrop-blur-md rounded-2xl border border-purple-500/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-purple-300">#{data.myRank.rank}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">あなたの順位</p>
              <p className="text-xs text-gray-400">スコア: {data.myRank.score.toLocaleString()}pt</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-yellow-300 font-bold">Lv.{data.myRank.level}</p>
              <p className="text-[10px] text-gray-500">{data.myRank.totalMessages.toLocaleString()}通</p>
            </div>
          </div>
        </div>
      )}

      {/* ランキングリスト */}
      <div className="px-4 py-4 space-y-2 pb-24">
        {data?.ranking.map((entry) => (
          <div
            key={entry.userId}
            className={`rounded-2xl border px-4 py-3 transition-all ${
              entry.rank <= 3
                ? `bg-gradient-to-r ${RANK_COLORS[entry.rank - 1]}`
                : entry.isMe
                ? 'bg-purple-900/30 border-purple-500/30'
                : 'bg-gray-900/40 border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* 順位 */}
              <div className="w-8 text-center flex-shrink-0">
                {entry.rank <= 3 ? (
                  <span className="text-2xl">{RANK_MEDALS[entry.rank - 1]}</span>
                ) : (
                  <span className="text-gray-500 font-bold text-sm">#{entry.rank}</span>
                )}
              </div>

              {/* アバター */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-600 to-pink-600">
                {entry.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {entry.displayName.charAt(0)}
                  </div>
                )}
              </div>

              {/* 名前+情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`font-semibold text-sm truncate ${entry.isMe ? 'text-purple-300' : 'text-white'}`}>
                    {entry.displayName}
                  </p>
                  {entry.isFanclub && (
                    <span className="text-[8px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
                      FC
                    </span>
                  )}
                  {entry.isMe && (
                    <span className="text-[8px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500">
                  Lv.{entry.level} · {entry.totalMessages.toLocaleString()}通
                  {entry.giftCoins > 0 && ` · 🪙${entry.giftCoins.toLocaleString()}`}
                </p>
              </div>

              {/* スコア */}
              <div className="text-right flex-shrink-0">
                <p className={`font-black text-sm ${entry.rank <= 3 ? 'text-yellow-300' : 'text-gray-300'}`}>
                  {entry.score.toLocaleString()}
                </p>
                <p className="text-[9px] text-gray-600">pt</p>
              </div>
            </div>
          </div>
        ))}

        {(!data?.ranking || data.ranking.length === 0) && (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-3">🏆</p>
            <p>まだランキングデータがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
