'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type PeriodType = 'weekly' | 'monthly' | 'alltime';
type ViewType = 'characters' | 'mine';

interface CharacterRankEntry {
  rank: number;
  characterId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  value: number;
  valueLabel: string;
  isFollowing?: boolean;
  isFanclub?: boolean;
}

interface MyRankEntry {
  characterId: string;
  characterName: string;
  characterSlug: string;
  characterAvatar: string | null;
  myRank: number;
  totalFans: number;
  score: number;
  level: number;
  totalMessages: number;
  isFanclub: boolean;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  weekly: '週間',
  monthly: '月間',
  alltime: '累計',
};

const CROWN = ['👑', '🥈', '🥉'];

export default function RankingPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewType>('characters');
  const [period, setPeriod] = useState<PeriodType>('weekly');
  const [charRankings, setCharRankings] = useState<CharacterRankEntry[]>([]);
  const [myRankings, setMyRankings] = useState<MyRankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // キャラランキング取得（type=messagesをメインに）
  useEffect(() => {
    if (view !== 'characters') return;
    setLoading(true);
    const periodParam = period === 'alltime' ? 'monthly' : period;
    Promise.all([
      fetch(`/api/ranking/characters?type=messages&period=${periodParam}`).then(r => r.json()),
      fetch('/api/relationship/following').then(r => r.ok ? r.json() : { following: [] }),
    ]).then(([rankData, followData]) => {
      const followList = followData.following ?? [];
      const followedIds = new Set<string>(
        followList.map((r: { id: string }) => r.id)
      );
      const fcIds = new Set<string>(
        followList
          .filter((r: { isFanclub: boolean }) => r.isFanclub)
          .map((r: { id: string }) => r.id)
      );
      const ranked: CharacterRankEntry[] = (rankData.ranking ?? []).map((r: CharacterRankEntry) => ({
        ...r,
        isFollowing: followedIds.has(r.characterId),
        isFanclub: fcIds.has(r.characterId),
      }));
      setCharRankings(ranked);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [view, period]);

  // 自分の推し度ランキング取得
  useEffect(() => {
    if (view !== 'mine') return;
    setLoading(true);
    fetch('/api/relationship/following')
      .then(r => r.ok ? r.json() : { following: [] })
      .then(async (followData) => {
        const followList = followData.following ?? [];
        if (followList.length === 0) { setMyRankings([]); setLoading(false); return; }
        // 各キャラの自分の順位を取得
        const results = await Promise.allSettled(
          followList.map(async (char: { id: string; name: string; slug: string; avatarUrl: string | null; isFanclub: boolean }) => {
            const res = await fetch(`/api/ranking/${char.id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return {
              characterId: char.id,
              characterName: char.name ?? '?',
              characterSlug: char.slug ?? '',
              characterAvatar: char.avatarUrl ?? null,
              myRank: data.myRank?.rank ?? 0,
              totalFans: data.totalFans ?? 0,
              score: data.myRank?.score ?? 0,
              level: data.myRank?.level ?? 1,
              totalMessages: data.myRank?.totalMessages ?? 0,
              isFanclub: data.myRank?.isFanclub ?? false,
            };
          })
        );
        const valid = results
          .filter((r): r is PromiseFulfilledResult<MyRankEntry> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
          .sort((a, b) => (a.myRank || 999) - (b.myRank || 999));
        setMyRankings(valid);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [view]);

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

      {/* ビュー切替タブ */}
      <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
        <div className="flex gap-1 bg-gray-900/60 rounded-2xl p-1">
          {(['characters', 'mine'] as ViewType[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setLoading(true); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                view === v
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {v === 'characters' ? '🌟 キャラランキング' : '⭐ 自分の推し度'}
            </button>
          ))}
        </div>
      </div>

      {/* 期間切替（キャラランキングのみ） */}
      {view === 'characters' && (
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex gap-1.5">
            {(['weekly', 'monthly', 'alltime'] as PeriodType[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  period === p
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 凡例（キャラランキングのみ） */}
      {view === 'characters' && !loading && charRankings.length > 0 && (
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border-2 border-purple-400/60 inline-block" />
            フォロー中
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border-2 border-yellow-400/60 inline-block" />
            FC加入済み
          </span>
        </div>
      )}

      {/* コンテンツ */}
      <div className="max-w-lg mx-auto px-4 space-y-2">
        {loading ? (
          <div className="flex flex-col gap-2 pt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-800/40 animate-pulse" />
            ))}
          </div>
        ) : view === 'characters' ? (
          // ===== キャラランキング =====
          charRankings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🏆</p>
              <p className="text-gray-400 text-sm">まだランキングデータがありません</p>
              <p className="text-gray-600 text-xs mt-1">チャットを楽しむとランキングに反映されます</p>
            </div>
          ) : (
            charRankings.map((entry) => (
              <button
                key={entry.characterId}
                onClick={() => router.push(`/ranking/${entry.characterId}`)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] ${
                  entry.isFanclub
                    ? 'bg-gradient-to-r from-yellow-900/25 to-amber-900/15 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                    : entry.isFollowing
                    ? 'bg-gradient-to-r from-purple-900/25 to-purple-800/10 border-2 border-purple-500/50 shadow-lg shadow-purple-500/10'
                    : 'bg-gray-900/40 border border-white/5 hover:border-white/10'
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

                {/* キャラアバター */}
                <div className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 ${
                  entry.isFanclub ? 'border-yellow-400/50' : entry.isFollowing ? 'border-purple-400/50' : 'border-white/10'
                }`}>
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt={entry.name}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-pink-700 text-white text-sm font-bold">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* キャラ名 + バッジ */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-white font-semibold text-sm truncate">{entry.name}</p>
                    {entry.isFanclub && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full border border-yellow-500/30 font-bold flex-shrink-0">
                        FC
                      </span>
                    )}
                    {entry.isFollowing && !entry.isFanclub && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/30 font-bold flex-shrink-0">
                        フォロー
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{entry.valueLabel}</p>
                </div>

                {/* 矢印 */}
                <svg className={`w-4 h-4 flex-shrink-0 ${entry.isFollowing || entry.isFanclub ? 'text-white/60' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )
        ) : (
          // ===== 自分の推し度ランキング =====
          myRankings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">⭐</p>
              <p className="text-gray-400 text-sm">まだフォローしているキャラがいません</p>
              <p className="text-gray-600 text-xs mt-1">キャラをフォローしてランキングに参加しよう</p>
              <button
                onClick={() => router.push('/explore')}
                className="mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-bold transition-colors"
              >
                キャラを探す
              </button>
            </div>
          ) : (
            myRankings.map((entry) => (
              <button
                key={entry.characterId}
                onClick={() => router.push(`/ranking/${entry.characterId}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-purple-900/20 border-2 border-purple-500/30 hover:border-purple-400/50 transition-all active:scale-[0.98]"
              >
                {/* キャラアバター */}
                <div className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 ${
                  entry.isFanclub ? 'border-yellow-400/60' : 'border-purple-400/40'
                }`}>
                  {entry.characterAvatar ? (
                    <Image
                      src={entry.characterAvatar}
                      alt={entry.characterName}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-pink-700 text-white text-sm font-bold">
                      {entry.characterName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* キャラ名 + バッジ */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold text-sm truncate">{entry.characterName}</p>
                    {entry.isFanclub && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full border border-yellow-500/30 font-bold">FC</span>
                    )}
                  </div>
                  <div className="flex gap-2 text-[11px] text-gray-500 mt-0.5">
                    <span>Lv.{entry.level}</span>
                    <span>💬{entry.totalMessages.toLocaleString()}通</span>
                    <span>🏆{entry.totalFans}人中</span>
                  </div>
                </div>

                {/* 自分の順位 */}
                <div className="text-right flex-shrink-0">
                  {entry.myRank > 0 ? (
                    <>
                      <p className="text-purple-300 font-black text-lg leading-tight">#{entry.myRank}</p>
                      <p className="text-[10px] text-gray-600">{entry.score}pt</p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-xs">圏外</p>
                  )}
                </div>

                <svg className="w-4 h-4 text-purple-400/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )
        )}
      </div>
    </div>
  );
}
