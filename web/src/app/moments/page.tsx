'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MomentCard, MOMENT_CARD_STYLES, type Moment, type MomentCharacter } from '@/components/moments/MomentCard';
import { track, EVENTS } from '@/lib/analytics';

/* ── Instagram風ストーリーズバー ── */

interface StoryItem {
  slug: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  activity: string;
  chatPrompt: string;
  franchise: string;
  timeAgo: string;
}

function InstaStoriesBar({ onOpenStory, activeTab, stories }: { onOpenStory: (index: number) => void; activeTab: 'recommend' | 'following'; stories: StoryItem[] }) {
  const [viewedSlugs, setViewedSlugs] = useState<Set<string>>(new Set());
  const [followingSlugs, setFollowingSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    // Load viewed state
    try {
      const v = JSON.parse(localStorage.getItem('aniva_stories_viewed') || '[]');
      setViewedSlugs(new Set(v));
    } catch { /* ignore */ }

    // フォロー中キャラのslug取得
    fetch('/api/characters?followingOnly=true')
      .then((r) => r.json())
      .then((data) => {
        const chars = data.characters ?? [];
        const slugs = new Set<string>(chars.map((c: { slug: string }) => c.slug));
        setFollowingSlugs(slugs);
      })
      .catch(() => setFollowingSlugs(new Set()));
  }, []);

  // タブに応じてストーリーズをフィルタリング
  // フォロー中タブ: followingSlugsがロード完了するまで空表示、ロード後はフォロー中キャラのみ
  const visibleStories = activeTab === 'following'
    ? (followingSlugs === null ? [] : stories.filter((s) => followingSlugs.has(s.slug)))
    : stories;

  return (
    <div className="bg-gray-950 border-b border-white/5 overflow-hidden max-w-lg mx-auto">
      <div className="flex gap-3 overflow-x-auto py-3 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {visibleStories.length === 0 && activeTab === 'following' ? (
          <div className="text-white/30 text-xs py-2 px-2">フォロー中のキャラのストーリーがここに表示されます</div>
        ) : visibleStories.map((story, i) => {
          const avatar = story.avatarUrl;
          const viewed = viewedSlugs.has(story.slug);
          // StoryViewerはstories全体を受け取るので元のindexを渡す
          const originalIndex = stories.findIndex((s) => s.slug === story.slug);
          return (
            <button
              key={story.slug}
              onClick={() => {
                onOpenStory(originalIndex);
                // Mark as viewed
                setViewedSlugs((prev) => {
                  const next = new Set(prev);
                  next.add(story.slug);
                  try { localStorage.setItem('aniva_stories_viewed', JSON.stringify([...next])); } catch {}
                  return next;
                });
              }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={`relative p-[3px] rounded-full transition-all ${
                viewed
                  ? 'bg-gray-600/50'
                  : 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500'
              }`}>
                <div className="bg-gray-950 rounded-full p-[2px]">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt={story.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                        {story.name[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] text-center w-16 truncate ${viewed ? 'text-white/40' : 'text-white/80'}`}>{story.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Full-screen Story Viewer (inline) ── */
function StoryViewer({ stories, initialIndex, onClose, onChat }: {
  stories: (StoryItem & { avatarUrl: string; coverUrl: string })[];
  initialIndex: number;
  onClose: () => void;
  onChat: (slug: string, topic: string) => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const paused = useRef(false);
  const story = stories[idx];

  const goNext = useCallback(() => {
    if (idx < stories.length - 1) { setIdx(i => i + 1); setProgress(0); }
    else onClose();
  }, [idx, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (idx > 0) { setIdx(i => i - 1); setProgress(0); }
  }, [idx]);

  useEffect(() => {
    setProgress(0);
    const iv = setInterval(() => {
      if (paused.current) return;
      setProgress(p => { if (p >= 100) { goNext(); return 0; } return p + 1.67; });
    }, 100);
    return () => clearInterval(iv);
  }, [idx, goNext]);

  if (!story) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black select-none"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (y / rect.height > 0.65) return;
        if (x / rect.width < 0.3) goPrev();
        else if (x / rect.width > 0.7) goNext();
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY; paused.current = true; }}
      onTouchEnd={(e) => {
        paused.current = false;
        const dx = e.changedTouches[0].clientX - touchX.current;
        const dy = e.changedTouches[0].clientY - touchY.current;
        if (dy > 100 && Math.abs(dx) < 50) { onClose(); return; }
        if (Math.abs(dx) > 60) { dx > 0 ? goPrev() : goNext(); }
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-100" style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4" style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 16px), 24px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 bg-gray-800">
            {story.avatarUrl && <img src={story.avatarUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="text-white text-sm font-bold drop-shadow-lg">{story.name}</p>
            <p className="text-white/60 text-xs drop-shadow">{story.timeAgo} • {story.franchise}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-8 h-8 flex items-center justify-center text-white/80 bg-black/30 rounded-full backdrop-blur-sm">✕</button>
      </div>
      {/* Content */}
      <div className="absolute inset-0">
        {story.coverUrl ? (
          <img src={story.coverUrl} alt={story.name} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 24px), 44px)' }}>
          <p className="text-white text-xl font-bold leading-relaxed mb-6 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{story.activity}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onChat(story.slug, story.activity); }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl px-6 py-4 flex items-center justify-center gap-3 shadow-xl shadow-purple-500/30 active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl">💬</span>
            <div className="text-left flex-1">
              <p className="text-white font-bold text-base">{story.chatPrompt}</p>
              <p className="text-white/70 text-xs">タップして会話を始める</p>
            </div>
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
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
      <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 px-1">💬 今すぐ話しかける</p>
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
  const searchParams = useSearchParams();
  const highlightMomentId = searchParams.get('highlight');

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
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  // Fetch stories for the stories bar and viewer
  useEffect(() => {
    fetch('/api/stories')
      .then((r) => r.json())
      .then((d) => setStories(d.stories || []))
      .catch(() => {});
  }, []);

  // 通知バッジ用カウント取得
  useEffect(() => {
    fetch('/api/notifications/unread-count')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setNotifCount(d.count); })
      .catch(() => {});
  }, []);

  // 通知からのハイライトスクロール
  useEffect(() => {
    if (!highlightMomentId || recommendLoading) return;
    // モーメントリスト読み込み後に該当要素にスクロール
    const timer = setTimeout(() => {
      const el = document.getElementById(`moment-${highlightMomentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // ハイライト演出（1.5秒間光らせる）
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 2px rgba(168,85,247,0.6), 0 0 20px rgba(168,85,247,0.3)';
        el.style.borderRadius = '16px';
        setTimeout(() => {
          el.style.boxShadow = 'none';
        }, 2000);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightMomentId, recommendLoading]);

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
    track(EVENTS.MOMENT_VIEWED, { tab: 'recommend' });
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
    const moment = currentMoments.find((m) => m.id === momentId);
    if (moment && !moment.userHasLiked) {
      track(EVENTS.MOMENT_LIKED, { momentId, characterId: moment.characterId });
    }
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
                href="/notifications"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors relative"
              >
                <svg className="w-4.5 h-4.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full leading-none border border-gray-950">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Tabs — X/Twitter風 */}
          <div className="max-w-lg mx-auto relative flex border-b border-white/5">
            {(['recommend', 'following'] as TabMode[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveCharacterId(null); track(EVENTS.TAB_SWITCHED, { tab, page: 'moments' }); }}
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

        {/* Instagram風ストーリーズバー — 常に表示 */}
        <div className="max-w-lg mx-auto">
          <InstaStoriesBar onOpenStory={(i) => setStoryViewerIndex(i)} activeTab={activeTab} stories={stories} />
        </div>

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
                {currentMoments.find(m => m.characterId === activeCharacterId)?.character.name ?? ''} のタイムライン
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">タイムラインを始めよう</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                好きなキャラクターをフォローすると、<br />ここに最新の投稿が届きます
              </p>
              <button
                onClick={() => { setActiveTab('recommend'); setActiveCharacterId(null); }}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
              >
                おすすめを見る
              </button>
            </div>
          ) : currentMoments.length === 0 ? (
            <div className="flex flex-col items-center py-20 px-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}
              >
                <svg className="w-9 h-9 text-purple-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">
                {activeTab === 'following' ? 'フォロー中の投稿はまだありません' : 'タイムラインを始めよう'}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed text-center mb-8 max-w-[260px]">
                {activeTab === 'following'
                  ? 'フォローしたキャラの日常がここに届きます。まずはキャラをフォローしてみよう。'
                  : '推しの近況がここに届きます。キャラをフォローして最新の投稿をチェックしよう。'
                }
              </p>
              <button
                onClick={() => router.push('/discover')}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                  boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
                }}
              >
                キャラを見つける
              </button>
            </div>
          ) : (
            <>
              {filteredMoments.map((moment) => (
                <div key={moment.id} id={`moment-${moment.id}`}>
                  <MomentCard
                    moment={moment}
                    onLike={handleLike}
                    currentUserId={(session?.user as { id?: string })?.id}
                    showFollowButton={activeTab === 'recommend'}
                    isFollowing={moment.isFollowing}
                    onFollowChange={handleFollowChange}
                    showQuickChat={activeTab === 'recommend'}
                    onQuickChat={handleQuickChat}
                  />
                </div>
              ))}
              {activeCharacterId && filteredMoments.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <p className="text-white/40 text-sm">まだ投稿がありません</p>
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

      {/* Full-screen Story Viewer */}
      {storyViewerIndex !== null && (() => {
        return (
          <StoryViewer
            stories={stories}
            initialIndex={storyViewerIndex}
            onClose={() => setStoryViewerIndex(null)}
            onChat={(slug, topic) => {
              setStoryViewerIndex(null);
              router.push(`/chat/${slug}?topic=${encodeURIComponent(topic.slice(0, 100))}&fromStory=1`);
            }}
          />
        );
      })()}
    </>
  );
}
