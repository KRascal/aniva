'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MomentCard, MOMENT_CARD_STYLES, type Moment, type MomentCharacter } from '@/components/moments/MomentCard';

/* ── Stories Bar ── */
function StoriesBar({
  moments,
  activeId,
  onSelect,
}: {
  moments: Moment[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
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
    <div className="sticky top-[57px] z-[15] bg-gray-950 border-b border-white/5 overflow-hidden max-w-lg mx-auto">
      <div className="flex gap-3 overflow-x-auto py-3 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* 全員ボタン */}
        <button
          onClick={() => onSelect(null)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className={`relative p-0.5 rounded-full ${activeId === null ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500' : 'bg-gray-700/50'} transition-all`}>
            <div className="bg-gray-950 rounded-full p-0.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-xl">🌊</span>
              </div>
            </div>
          </div>
          <span className={`text-[10px] text-center w-14 truncate ${activeId === null ? 'text-white font-bold' : 'text-white/50'}`}>全員</span>
        </button>

        {characters.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(isActive ? null : item.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={`relative p-0.5 rounded-full transition-all ${isActive ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 scale-110' : 'bg-gray-700/50 hover:bg-gradient-to-br hover:from-purple-500/50 hover:via-pink-500/50 hover:to-rose-500/50'}`}>
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
                {isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-pink-500 rounded-full border-2 border-gray-950 flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </span>
                )}
              </div>
              <span className={`text-[10px] text-center w-14 truncate transition-all ${isActive ? 'text-white font-bold' : 'text-white/60'}`}>{item.character.name}</span>
            </button>
          );
        })}
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

/* ── QuickChat Carousel ── */
function QuickChatCarousel({
  characters,
  onChat,
}: {
  characters: { id: string; character: MomentCharacter; preview: string }[];
  onChat: (characterId: string) => void;
}) {
  if (characters.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-2 px-1">💬 今すぐ話しかける</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {characters.map((item) => (
          <button
            key={item.id}
            onClick={() => onChat(item.id)}
            className="flex-shrink-0 flex flex-col items-center gap-2 bg-gray-900/70 border border-white/8 rounded-2xl p-3 w-28 hover:border-purple-500/40 hover:bg-purple-900/20 transition-all active:scale-95"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/40 flex-shrink-0">
              {item.character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.character.avatarUrl} alt={item.character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                  {item.character.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-center w-full">
              <p className="text-white text-xs font-bold truncate">{item.character.name}</p>
              {item.preview && (
                <p className="text-white/40 text-[10px] line-clamp-2 mt-0.5 leading-snug">{item.preview}</p>
              )}
            </div>
            <span className="flex items-center gap-1 bg-purple-600/80 hover:bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors">
              💬 話す
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Tab type ── */
type TabMode = 'recommend' | 'following';

/* ────────────────────────────────── page ── */

export default function MomentsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // タブ状態
  const [activeTab, setActiveTab] = useState<TabMode>('recommend');

  // 「おすすめ」タブ用
  const [recommendMoments, setRecommendMoments] = useState<Moment[]>([]);
  const [recommendNextCursor, setRecommendNextCursor] = useState<string | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(true);
  const [recommendLoadingMore, setRecommendLoadingMore] = useState(false);

  // 「フォロー中」タブ用
  const [followingMoments, setFollowingMoments] = useState<Moment[]>([]);
  const [followingNextCursor, setFollowingNextCursor] = useState<string | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoadingMore, setFollowingLoadingMore] = useState(false);
  const [isFollowingNone, setIsFollowingNone] = useState(false);
  const [followingFetched, setFollowingFetched] = useState(false);

  // 共通
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshHint, setShowRefreshHint] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  // スワイプ検知
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  /* ── fetch helpers ── */
  const fetchRecommend = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20', mode: 'recommend' });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/moments?${params}`);
    if (!res.ok) return null;
    return res.json() as Promise<{ moments: Moment[]; nextCursor: string | null }>;
  }, []);

  const fetchFollowing = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/moments?${params}`);
    if (!res.ok) return null;
    return res.json() as Promise<{ moments: Moment[]; nextCursor: string | null; isFollowingNone?: boolean }>;
  }, []);

  /* ── initial load: recommend ── */
  useEffect(() => {
    setRecommendLoading(true);
    fetchRecommend().then((data) => {
      if (data) {
        setRecommendMoments(data.moments);
        setRecommendNextCursor(data.nextCursor);
      }
      setRecommendLoading(false);
    });
  }, [fetchRecommend]);

  /* ── lazy load following tab on first switch ── */
  useEffect(() => {
    if (activeTab === 'following' && !followingFetched) {
      setFollowingLoading(true);
      fetchFollowing().then((data) => {
        if (data) {
          setFollowingMoments(data.moments);
          setFollowingNextCursor(data.nextCursor);
          setIsFollowingNone(data.isFollowingNone ?? false);
        }
        setFollowingLoading(false);
        setFollowingFetched(true);
      });
    }
  }, [activeTab, followingFetched, fetchFollowing]);

  /* ── refresh ── */
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setShowRefreshHint(true);

    if (activeTab === 'recommend') {
      const data = await fetchRecommend();
      if (data) {
        setRecommendMoments(data.moments);
        setRecommendNextCursor(data.nextCursor);
      }
    } else {
      const data = await fetchFollowing();
      if (data) {
        setFollowingMoments(data.moments);
        setFollowingNextCursor(data.nextCursor);
        setIsFollowingNone(data.isFollowingNone ?? false);
      }
    }

    setRefreshing(false);
    setTimeout(() => setShowRefreshHint(false), 300);
  }, [refreshing, activeTab, fetchRecommend, fetchFollowing]);

  /* ── pull-to-refresh touch ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
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

  const handleTouchEnd = (e: React.TouchEvent) => {
    // スワイプ切り替え
    if (touchStartX.current !== null) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = touchStartY.current !== null
        ? Math.abs(e.changedTouches[0].clientY - touchStartY.current)
        : 0;

      if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
        // 横スワイプ優先
        if (dx < -50 && activeTab === 'recommend') {
          // 左スワイプ → フォロー中
          setActiveTab('following');
          setActiveCharacterId(null);
        } else if (dx > 50 && activeTab === 'following') {
          // 右スワイプ → おすすめ
          setActiveTab('recommend');
          setActiveCharacterId(null);
        }
      }
    }

    // pull-to-refresh
    if (showRefreshHint && !refreshing && touchStartY.current !== null) {
      const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
      if (dy > 60) handleRefresh();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  /* ── load more ── */
  const handleLoadMoreRecommend = async () => {
    if (!recommendNextCursor) return;
    setRecommendLoadingMore(true);
    const data = await fetchRecommend(recommendNextCursor);
    if (data) {
      setRecommendMoments((prev) => [...prev, ...data.moments]);
      setRecommendNextCursor(data.nextCursor);
    }
    setRecommendLoadingMore(false);
  };

  const handleLoadMoreFollowing = async () => {
    if (!followingNextCursor) return;
    setFollowingLoadingMore(true);
    const data = await fetchFollowing(followingNextCursor);
    if (data) {
      setFollowingMoments((prev) => [...prev, ...data.moments]);
      setFollowingNextCursor(data.nextCursor);
    }
    setFollowingLoadingMore(false);
  };

  /* ── like ── */
  const handleLike = (momentId: string) => {
    if (!session?.user) return;
    const updater = (prev: Moment[]) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const liked = !m.userHasLiked;
        return { ...m, userHasLiked: liked, reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1 };
      });
    setRecommendMoments(updater);
    setFollowingMoments(updater);

    fetch(`/api/moments/${momentId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'like' }),
    })
      .then(async (res) => {
        if (res.ok) {
          const { liked, reactionCount } = await res.json();
          const sync = (prev: Moment[]) =>
            prev.map((m) => (m.id === momentId ? { ...m, userHasLiked: liked, reactionCount } : m));
          setRecommendMoments(sync);
          setFollowingMoments(sync);
        }
      })
      .catch(() => {});
  };

  /* ── follow change callback (おすすめタブ) ── */
  const handleFollowChange = (characterId: string, following: boolean) => {
    setRecommendMoments((prev) =>
      prev.map((m) => (m.characterId === characterId ? { ...m, isFollowing: following } : m))
    );
  };

  /* ── quick chat (おすすめタブ) ── */
  const handleQuickChat = useCallback((characterId: string, content: string) => {
    const topic = encodeURIComponent(content.slice(0, 100));
    router.push(`/chat/${characterId}?topic=${topic}`);
  }, [router]);

  /* ── quick chat carousel characters (おすすめタブ上部) ── */
  const quickChatChars = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; character: MomentCharacter; preview: string }[] = [];
    for (const m of recommendMoments) {
      if (!seen.has(m.characterId) && result.length < 5) {
        seen.add(m.characterId);
        result.push({
          id: m.characterId,
          character: m.character,
          preview: (m.content ?? '').slice(0, 28),
        });
      }
    }
    return result;
  }, [recommendMoments]);

  /* ── seed ── */
  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const res = await fetch('/api/moments/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(`✅ ${data.message}`);
        const fresh = await fetchRecommend();
        if (fresh) {
          setRecommendMoments(fresh.moments);
          setRecommendNextCursor(fresh.nextCursor);
        }
      } else {
        setSeedMessage(`❌ ${data.error}`);
      }
    } catch {
      setSeedMessage('❌ エラーが発生しました');
    }
    setSeeding(false);
  };

  /* ── derived ── */
  const currentMoments = activeTab === 'recommend' ? recommendMoments : followingMoments;
  const currentLoading = activeTab === 'recommend' ? recommendLoading : followingLoading;
  const currentNextCursor = activeTab === 'recommend' ? recommendNextCursor : followingNextCursor;
  const currentLoadingMore = activeTab === 'recommend' ? recommendLoadingMore : followingLoadingMore;

  const filteredMoments = activeCharacterId
    ? currentMoments.filter((m) => m.characterId === activeCharacterId)
    : currentMoments;

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
        <header className="sticky top-0 z-20 bg-gray-950 border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">タイムライン</h1>
              {currentMoments.length > 0 && (
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

          {/* Tabs — X/Twitter風 */}
          <div className="max-w-lg mx-auto relative flex border-b border-white/5">
            {(['recommend', 'following'] as TabMode[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveCharacterId(null); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                  activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'recommend' ? 'おすすめ' : 'フォロー中'}
                {/* アクティブインジケーター */}
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-purple-500 transition-all duration-300"
                  style={{ width: activeTab === tab ? '40%' : '0%' }}
                />
              </button>
            ))}
          </div>
        </header>

        {/* Stories bar — フォロー中タブのみ表示 */}
        {activeTab === 'following' && !currentLoading && followingMoments.length > 0 && (
          <div className="max-w-lg mx-auto">
            <StoriesBar moments={followingMoments} activeId={activeCharacterId} onSelect={setActiveCharacterId} />
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

          {/* アクティブフィルターラベル */}
          {activeCharacterId && !currentLoading && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-purple-300 font-medium">
                {currentMoments.find(m => m.characterId === activeCharacterId)?.character.name ?? ''} のモーメント
              </span>
              <button
                onClick={() => setActiveCharacterId(null)}
                className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                クリア
              </button>
            </div>
          )}

          {/* おすすめタブ — 今すぐ話しかけるカルーセル */}
          {activeTab === 'recommend' && !currentLoading && quickChatChars.length > 0 && (
            <QuickChatCarousel
              characters={quickChatChars}
              onChat={(characterId) => router.push(`/chat/${characterId}`)}
            />
          )}

          {/* Feed */}
          {currentLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : activeTab === 'following' && isFollowingNone ? (
            <div className="text-center py-20 px-6">
              <div className="relative inline-block mb-5">
                <div className="text-7xl">🌟</div>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">タイムラインを始めよう</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                好きなキャラクターをフォローすると、<br />ここに最新の投稿が届きます
              </p>
              <button
                onClick={() => { setActiveTab('recommend'); setActiveCharacterId(null); }}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
              >
                <span>✨</span>
                おすすめを見る
              </button>
            </div>
          ) : currentMoments.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-block mb-4">
                <div className="text-6xl">📭</div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 rounded-full animate-pulse" />
              </div>
              <p className="text-white/50 font-medium text-sm">まだ投稿がありません</p>
              <p className="text-white/25 text-xs mt-1">
                {activeTab === 'following' ? 'フォロー中のキャラがまだ投稿していません' : '投稿が見つかりませんでした'}
              </p>
            </div>
          ) : (
            <>
              {filteredMoments.map((moment) => (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  onLike={handleLike}
                  currentUserId={(session?.user as { id?: string })?.id}
                  showFollowButton={activeTab === 'recommend'}
                  isFollowing={moment.isFollowing}
                  onFollowChange={handleFollowChange}
                  showQuickChat={activeTab === 'recommend'}
                  onQuickChat={handleQuickChat}
                />
              ))}
              {activeCharacterId && filteredMoments.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🌸</div>
                  <p className="text-white/50 text-sm">まだモーメントがありません</p>
                </div>
              )}

              {currentNextCursor && (
                <button
                  onClick={activeTab === 'recommend' ? handleLoadMoreRecommend : handleLoadMoreFollowing}
                  disabled={currentLoadingMore}
                  className="w-full py-3.5 text-sm text-white/40 hover:text-white/70 bg-gray-900/50 hover:bg-gray-900/80 rounded-2xl transition-all disabled:opacity-50 border border-white/5"
                >
                  {currentLoadingMore ? (
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

        <div className="h-24" />
      </div>
    </>
  );
}
