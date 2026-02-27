'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MomentCard, MOMENT_CARD_STYLES, type Moment, type MomentCharacter } from '@/components/moments/MomentCard';

/* ── Stories Bar ── */
function StoriesBar({ moments }: { moments: Moment[] }) {
  const seen = new Set<string>();
  const characters: { id: string; character: MomentCharacter }[] = [];
  for (const m of moments) {
    if (!seen.has(m.characterId)) {
      seen.add(m.characterId);
      characters.push({ id: m.characterId, character: m.character });
    }
  }

  if (characters.length === 0) return null;

  return (
    <div className="sticky top-[57px] z-[15] bg-gray-950/80 backdrop-blur-xl border-b border-white/5 overflow-hidden max-w-lg mx-auto">
      <div className="flex gap-4 overflow-x-auto py-3 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {characters.map((item) => (
          <Link key={item.id} href={`/profile/${item.id}`} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative p-0.5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500">
              <div className="bg-gray-950 rounded-full p-0.5">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-0">
                  {item.character.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.character.avatarUrl} alt={item.character.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                      {item.character.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-white/60 text-[10px] text-center w-14 truncate">{item.character.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Pull-to-refresh indicator ── */
function RefreshIndicator({ visible, spinning }: { visible: boolean; spinning: boolean }) {
  return (
    <div
      className="flex items-center justify-center gap-2 overflow-hidden transition-all duration-300"
      style={{ height: visible ? 44 : 0, opacity: visible ? 1 : 0 }}
    >
      <div className={`w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full ${spinning ? 'animate-spin' : ''}`} />
      <span className="text-purple-400 text-xs font-medium">
        {spinning ? '更新中…' : '↓ 引いて更新'}
      </span>
    </div>
  );
}

/* ── skeleton card ── */
function SkeletonCard() {
  return (
    <div className="bg-gray-900/70 border border-white/6 rounded-3xl overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-gray-700" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-700 rounded-full w-24" />
          <div className="h-2.5 bg-gray-800 rounded-full w-16" />
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="h-3 bg-gray-700 rounded-full w-full" />
        <div className="h-3 bg-gray-700 rounded-full w-4/5" />
        <div className="h-3 bg-gray-800 rounded-full w-3/5" />
      </div>
    </div>
  );
}

/* ────────────────────────────────── page ── */

export default function MomentsPage() {
  const { data: session } = useSession();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshHint, setShowRefreshHint] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [isFollowingNone, setIsFollowingNone] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const fetchMoments = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`/api/moments?${params}`);
    if (!res.ok) return null;
    return res.json() as Promise<{ moments: Moment[]; nextCursor: string | null; isFollowingNone?: boolean }>;
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMoments().then((data) => {
      if (data) {
        setMoments(data.moments);
        setNextCursor(data.nextCursor);
        setIsFollowingNone(data.isFollowingNone ?? false);
      }
      setLoading(false);
    });
  }, [fetchMoments]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setShowRefreshHint(true);
    const data = await fetchMoments();
    if (data) {
      setMoments(data.moments);
      setNextCursor(data.nextCursor);
      setIsFollowingNone(data.isFollowingNone ?? false);
    }
    setRefreshing(false);
    setTimeout(() => setShowRefreshHint(false), 300);
  }, [refreshing, fetchMoments]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mainRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 60 && !refreshing) {
      setShowRefreshHint(true);
    }
  };

  const handleTouchEnd = () => {
    if (showRefreshHint && !refreshing) {
      handleRefresh();
    }
    touchStartY.current = null;
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchMoments(nextCursor);
    if (data) {
      setMoments((prev) => [...prev, ...data.moments]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  };

  const handleLike = async (momentId: string) => {
    if (!session?.user) return;

    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const liked = !m.userHasLiked;
        return { ...m, userHasLiked: liked, reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1 };
      })
    );

    try {
      const res = await fetch(`/api/moments/${momentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like' }),
      });
      if (res.ok) {
        const { liked, reactionCount } = await res.json();
        setMoments((prev) =>
          prev.map((m) => (m.id === momentId ? { ...m, userHasLiked: liked, reactionCount } : m))
        );
      }
    } catch {
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          const liked = !m.userHasLiked;
          return { ...m, userHasLiked: liked, reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1 };
        })
      );
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const res = await fetch('/api/moments/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(`✅ ${data.message}`);
        const fresh = await fetchMoments();
        if (fresh) {
          setMoments(fresh.moments);
          setNextCursor(fresh.nextCursor);
        }
      } else {
        setSeedMessage(`❌ ${data.error}`);
      }
    } catch {
      setSeedMessage('❌ エラーが発生しました');
    }
    setSeeding(false);
  };

  return (
    <>
      <style>{MOMENT_CARD_STYLES}</style>

      <div className="min-h-screen bg-gray-950">
        {/* Ambient blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-purple-700/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-pink-700/10 blur-3xl" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">タイムライン</h1>
              {moments.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <svg
                  className={`w-4 h-4 text-white/60 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <Link
                href="/chat"
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
              >
                <span>💬</span>
                <span>チャット</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Stories bar */}
        {!loading && moments.length > 0 && (
          <div className="max-w-lg mx-auto">
            <StoriesBar moments={moments} />
          </div>
        )}

        <main
          ref={mainRef}
          className="relative z-10 max-w-lg mx-auto px-4 py-4 space-y-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <RefreshIndicator visible={showRefreshHint} spinning={refreshing} />

          {/* DEV seed banner */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="bg-gray-800/80 border border-yellow-500/30 rounded-2xl p-3 flex items-center justify-between gap-3">
              <span className="text-yellow-400 text-xs font-mono">🔧 DEV</span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {seedMessage && (
                  <span className="text-xs text-gray-300">{seedMessage}</span>
                )}
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="text-xs bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl transition-colors"
                >
                  {seeding ? '投入中…' : 'サンプルデータ投入'}
                </button>
              </div>
            </div>
          )}

          {/* Feed */}
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isFollowingNone ? (
            <div className="text-center py-20 px-6">
              <div className="relative inline-block mb-5">
                <div className="text-7xl">🌟</div>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">タイムラインを始めよう</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                好きなキャラクターをフォローすると、<br />ここに最新の投稿が届きます
              </p>
              <a
                href="/explore"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
              >
                <span>✨</span>
                キャラクターを探す
              </a>
            </div>
          ) : moments.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-block mb-4">
                <div className="text-6xl">📭</div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 rounded-full animate-pulse" />
              </div>
              <p className="text-white/50 font-medium text-sm">まだ投稿がありません</p>
              <p className="text-white/25 text-xs mt-1">
                フォロー中のキャラがまだ投稿していません
              </p>
            </div>
          ) : (
            <>
              {moments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} onLike={handleLike} />
              ))}

              {nextCursor && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-3.5 text-sm text-white/40 hover:text-white/70 bg-gray-900/50 hover:bg-gray-900/80 rounded-2xl transition-all disabled:opacity-50 border border-white/5"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      読み込み中…
                    </span>
                  ) : (
                    'もっと見る ↓'
                  )}
                </button>
              )}
            </>
          )}
        </main>

        <div className="h-10" />
      </div>
    </>
  );
}
