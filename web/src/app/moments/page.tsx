'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface MomentCharacter {
  name: string;
  avatarUrl: string | null;
}

interface Moment {
  id: string;
  characterId: string;
  character: MomentCharacter;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  visibility: string;
  levelRequired: number;
  publishedAt: string;
  reactionCount: number;
  userHasLiked: boolean;
  isLocked: boolean;
  commentCount?: number;
}

interface MomentCommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

/* ────────────────────────────────── helpers ── */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return 'たった今';
}

function fullDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ── Avatar ── */
function Avatar({
  character,
  size = 'md',
  ring = false,
  online = false,
}: {
  character: MomentCharacter;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
  online?: boolean;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm';
  const ringClass = ring ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : '';

  return (
    <div className={`relative flex-shrink-0 ${sizeClass}`}>
      <div className={`${sizeClass} rounded-full overflow-hidden ${ringClass}`}>
        {character.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-gray-900" />
      )}
    </div>
  );
}

/* ── Stories Bar ── */
function StoriesBar({ moments }: { moments: Moment[] }) {
  // deduplicate by character
  const seen = new Set<string>();
  const characters: MomentCharacter[] = [];
  for (const m of moments) {
    if (!seen.has(m.characterId)) {
      seen.add(m.characterId);
      characters.push(m.character);
    }
  }

  if (characters.length === 0) return null;

  return (
    <div className="sticky top-[57px] z-10 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 -mx-4 px-4">
      <div className="flex gap-4 overflow-x-auto py-3 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {characters.map((char, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            {/* Ring gradient animation */}
            <div className="relative p-0.5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500">
              <div className="bg-gray-950 rounded-full p-0.5">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-0">
                  {char.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                      {char.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-white/60 text-[10px] text-center w-14 truncate">{char.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Floating Hearts animation ── */
interface FloatingHeart {
  id: number;
  x: number;
}

function FloatingHearts({ hearts }: { hearts: FloatingHeart[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute text-red-400 text-lg"
          style={{
            left: h.x,
            bottom: 24,
            animation: 'floatHeart 1.2s ease-out forwards',
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}

/* ── Wave heights for audio UI ── */
const MOMENT_WAVE_HEIGHTS = [20, 35, 50, 65, 45, 70, 55, 30, 60, 80, 45, 65, 35, 55, 75, 40, 60, 50, 70, 35, 55, 65, 45, 30, 55, 70, 40, 25];

/* ── Media placeholder ── */
function MediaPlaceholder({
  type,
  mediaUrl,
  onDoubleTap,
}: {
  type: string;
  mediaUrl: string | null;
  onDoubleTap?: () => void;
}) {
  const [showLikeHeart, setShowLikeHeart] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleTap = () => {
    if (!onDoubleTap) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      // Double-tap detected
      onDoubleTap();
      setShowLikeHeart(true);
      setTimeout(() => setShowLikeHeart(false), 900);
    }
    lastTapRef.current = now;
  };

  if (type === 'IMAGE') {
    if (mediaUrl) {
      return (
        <div
          className="relative overflow-hidden mb-3 bg-gray-800 cursor-pointer"
          onClick={handleTap}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl} alt="" className="w-full object-cover" style={{ maxHeight: 360 }} />
          {/* Double-tap heart burst */}
          {showLikeHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-6xl"
                style={{
                  animation: 'heartBurst 0.85s ease-out forwards',
                  display: 'inline-block',
                }}
              >
                ❤️
              </span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="overflow-hidden mb-3 bg-gradient-to-br from-gray-800 to-gray-750 flex flex-col items-center justify-center h-44 border-y border-white/5">
        <div className="text-4xl mb-2">🖼️</div>
        <p className="text-white/30 text-xs">画像を準備中…</p>
      </div>
    );
  }

  if (type === 'AUDIO' || type === 'VOICE') {
    return (
      <div className="rounded-2xl mb-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/20 p-4">
        <div className="flex items-center gap-3">
          {/* Play button */}
          <button className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0 hover:scale-110 active:scale-95 transition-transform">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          {/* Waveform bars */}
          <div className="flex items-end gap-0.5 flex-1 h-8">
            {MOMENT_WAVE_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-gradient-to-t from-purple-500 to-pink-400 opacity-70"
                style={{ height: `${h}%`, minHeight: 3 }}
              />
            ))}
          </div>
          <span className="text-white/40 text-xs flex-shrink-0">0:30</span>
        </div>
      </div>
    );
  }

  return null;
}

/* ── Moment Card ── */
function MomentCard({
  moment,
  onLike,
}: {
  moment: Moment;
  onLike: (id: string) => void;
}) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [bouncing, setBouncing] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const likeRef = useRef<HTMLButtonElement>(null);

  const handleLike = () => {
    onLike(moment.id);
    // Float hearts
    const newHeart: FloatingHeart = {
      id: Date.now(),
      x: Math.random() * 40 - 10,
    };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== newHeart.id)), 1300);
    // Bounce icon
    setBouncing(true);
    setTimeout(() => setBouncing(false), 400);
  };

  return (
    <div className="bg-gray-900/70 backdrop-blur-sm border border-white/6 rounded-3xl overflow-hidden shadow-lg hover:border-white/12 transition-colors">
      {/* Instagram-style header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar character={moment.character} ring online />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">{moment.character.name}</p>
          <p className="text-white/40 text-xs" title={fullDateTime(moment.publishedAt)}>
            {relativeTime(moment.publishedAt)}
          </p>
        </div>
        {/* kebab */}
        <button className="text-white/30 hover:text-white/60 transition-colors px-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Visibility badge */}
      {!moment.isLocked && moment.visibility === 'STANDARD' && (
        <div className="px-4 mb-2">
          <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20">
            ⭐ STANDARDメンバー限定
          </span>
        </div>
      )}
      {!moment.isLocked && moment.visibility === 'PREMIUM' && (
        <div className="px-4 mb-2">
          <span className="inline-flex items-center gap-1 bg-yellow-500/15 text-yellow-300 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20">
            👑 PREMIUMメンバー限定
          </span>
        </div>
      )}

      {/* Content */}
      <div className={moment.type === 'IMAGE' && !moment.isLocked ? '' : 'px-4 pb-1'}>
        {moment.isLocked ? (
          <div className="relative rounded-2xl overflow-hidden mb-3">
            <p className="text-gray-300 text-sm leading-relaxed blur-sm select-none py-2">
              ロックされたコンテンツです。レベルを上げることで解放されます。もう少し頑張ってみてください！
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-[2px]">
              <div className="bg-gray-900/90 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-white text-xs font-semibold">まだ見られません</p>
                  <p className="text-white/50 text-[10px]">レベル {moment.levelRequired} 以上で解放</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Media — images are full-width (no horizontal padding) */}
            {(moment.type === 'IMAGE' || moment.type === 'AUDIO' || moment.type === 'VOICE') && (
              <MediaPlaceholder
                type={moment.type}
                mediaUrl={moment.mediaUrl}
                onDoubleTap={() => onLike(moment.id)}
              />
            )}
            {/* Text — add horizontal padding back for text-only posts */}
            {moment.content && (
              <p className={`text-gray-100 text-sm leading-relaxed mb-3 ${moment.type === 'IMAGE' ? 'px-4' : ''}`}>
                {moment.content}
              </p>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-4" />

      {/* Actions */}
      <div className="relative flex items-center justify-between px-4 py-3">
        {/* Floating hearts container */}
        <FloatingHearts hearts={hearts} />

        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            ref={likeRef}
            onClick={handleLike}
            className="flex items-center gap-1.5 group"
            aria-label="いいね"
          >
            <span
              key={String(moment.userHasLiked)}
              className={`text-xl inline-block ${bouncing ? 'like-pop' : ''}`}
            >
              {moment.userHasLiked ? '❤️' : '🤍'}
            </span>
            <span className={`text-sm font-semibold transition-colors ${moment.userHasLiked ? 'text-red-400' : 'text-white/40 group-hover:text-white/60'}`}>
              {moment.reactionCount > 0 ? moment.reactionCount.toLocaleString() : ''}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setCommentOpen(true)}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">コメント</span>
          </button>

          {commentOpen && (
            <CommentModal momentId={moment.id} onClose={() => setCommentOpen(false)} />
          )}
        </div>

        {/* Share */}
        <button className="text-white/30 hover:text-white/60 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        </button>
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

/* ── Comment Modal ── */
function CommentModal({
  momentId,
  onClose,
}: {
  momentId: string;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<MomentCommentItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/moments/${momentId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, [momentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/moments/${momentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim() }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setInput('');
    }
    setPosting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 rounded-t-2xl border-t border-white/10 flex flex-col"
        style={{ maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">コメント</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && <p className="text-white/40 text-xs text-center py-4">読み込み中…</p>}
          {!loading && comments.length === 0 && (
            <p className="text-white/30 text-xs text-center py-4">まだコメントはありません</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(c.user.name ?? c.user.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-white/70">{c.user.name ?? c.user.email.split('@')[0]}</p>
                <p className="text-sm text-white/90 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        {session ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="コメントを入力…"
              maxLength={500}
              className="flex-1 bg-white/5 rounded-full px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || posting}
              className="text-sm font-semibold text-purple-400 disabled:opacity-40"
            >
              送信
            </button>
          </form>
        ) : (
          <p className="text-center text-white/40 text-xs py-3">コメントするにはログインが必要です</p>
        )}
      </div>
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

  // touch pull-to-refresh state
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

  /* pull-to-refresh */
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
      {/* keyframes for floating hearts and image double-tap */}
      <style>{`
        @keyframes floatHeart {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          60%  { transform: translateY(-60px) scale(1.3); opacity: 0.9; }
          100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
        }
        @keyframes heartBurst {
          0%   { transform: scale(0.4); opacity: 0; }
          30%  { transform: scale(1.4); opacity: 1; }
          60%  { transform: scale(1.0); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes likePopIn {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.6); }
          60%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .like-pop { animation: likePopIn 0.4s cubic-bezier(0.22,1,0.36,1); }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

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
              {/* Unread dot */}
              {moments.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Refresh button */}
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
        {!loading && moments.length > 0 && <StoriesBar moments={moments} />}

        <main
          ref={mainRef}
          className="relative z-10 max-w-lg mx-auto px-4 py-4 space-y-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull-to-refresh indicator */}
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
            /* フォロー0人のときの空状態 */
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
