'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { track, EVENTS } from '@/lib/analytics';

interface DiscoverCharacter {
  id: string;
  slug: string;
  name: string;
  franchise: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[] | null;
  description: string | null;
}

const SKIPPED_KEY = 'aniva_skipped_chars';

function getSkippedSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SKIPPED_KEY) ?? '[]');
  } catch { return []; }
}

function addSkippedSlug(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSkippedSlugs();
    if (!current.includes(slug)) {
      localStorage.setItem(SKIPPED_KEY, JSON.stringify([...current, slug]));
    }
  } catch { /* ignore */ }
}

export default function DiscoverPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<DiscoverCharacter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false); // Safari stale closure対策
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    track(EVENTS.DISCOVER_VIEWED);
    (async () => {
      try {
        // フォロー済みキャラIDを取得して除外
        let followingCharIds: string[] = [];
        try {
          const followRes = await fetch('/api/relationship/all');
          if (followRes.ok) {
            const followData = await followRes.json();
            followingCharIds = (followData.relationships ?? [])
              .filter((r: { isFollowing?: boolean }) => r.isFollowing)
              .map((r: { characterId?: string }) => r.characterId)
              .filter(Boolean);
          }
        } catch { /* ignore */ }

        const res = await fetch('/api/characters?limit=50&random=1');
        if (res.ok) {
          const data = await res.json();
          const skipped = getSkippedSlugs();
          // Filter out skipped + already followed chars
          const available = (data.characters ?? [])
            .filter((c: DiscoverCharacter) => !skipped.includes(c.slug))
            .filter((c: DiscoverCharacter) => !followingCharIds.includes(c.id));
          
          // フォローできるキャラが10人未満の場合はスキップ済みも含めて表示
          const pool = available.length >= 3 ? available : (data.characters ?? [])
            .filter((c: DiscoverCharacter) => !followingCharIds.includes(c.id));
          
          const chars = pool
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(pool.length, 10));
          
          setCharacters(chars);
          
          // フォローできるキャラが0人の場合
          if (chars.length === 0) {
            setCharacters([]);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const swipeOut = useCallback((direction: 'left' | 'right') => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    setSwipeDirection(direction);
    setSwipeX(direction === 'left' ? -500 : 500);

    const char = characters[currentIndexRef.current];
    track(EVENTS.TINDER_SWIPE, { direction, characterId: char?.id, characterSlug: char?.slug });
    if (direction === 'left' && char) {
      addSkippedSlug(char.slug);
    }
    // 右スワイプ = フォロー
    if (direction === 'right' && char) {
      setFollowedIds(prev => [...prev, char.id]);
      fetch(`/api/relationship/${char.slug}/follow`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.isFollowing) {
            fetch(`/api/relationship/${char.slug}/follow-welcome`, { method: 'POST' }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    setTimeout(() => {
      currentIndexRef.current += 1;
      setCurrentIndex(prev => prev + 1);
      setSwipeX(0);
      setSwipeDirection(null);
      isAnimatingRef.current = false;
      setIsAnimating(false);
    }, 350);
  }, [characters]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimating) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    setSwipeX(dx);
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || isAnimating) return;
    const threshold = 100;
    if (swipeX > threshold) {
      swipeOut('right');
    } else if (swipeX < -threshold) {
      swipeOut('left');
    } else {
      setSwipeX(0);
    }
    touchStartRef.current = null;
  };

  // Mouse events for desktop
  const mouseStartRef = useRef<{ x: number } | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    mouseStartRef.current = { x: e.clientX };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current || isAnimating) return;
    setSwipeX(e.clientX - mouseStartRef.current.x);
  };
  const handleMouseUp = () => {
    if (!mouseStartRef.current || isAnimating) return;
    const threshold = 100;
    if (swipeX > threshold) swipeOut('right');
    else if (swipeX < -threshold) swipeOut('left');
    else setSwipeX(0);
    mouseStartRef.current = null;
  };

  // currentIndexRefをstateと同期
  currentIndexRef.current = currentIndex;
  const currentChar = characters[currentIndex];
  const nextChar = characters[currentIndex + 1];
  const rotation = swipeX * 0.08;
  const opacity = Math.max(0, 1 - Math.abs(swipeX) / 500);
  const isComplete = !currentChar || currentIndex >= characters.length;

  // グリーティング送信（完了時）— hooksはearly returnの前に配置必須
  const greetSentRef = useRef(false);
  useEffect(() => {
    if (isComplete && followedIds.length > 0 && !greetSentRef.current) {
      greetSentRef.current = true;
      fetch('/api/onboarding/follow-and-greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterIds: followedIds }),
      }).catch(() => {});
    }
  }, [isComplete, followedIds]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
        <div className="animate-pulse text-white/40 text-lg">読み込み中...</div>
      </div>
    );
  }

  if (isComplete) {
    const followedChars = characters.filter(c => followedIds.includes(c.id));
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 px-6">
        <div className="text-4xl mb-4">💌</div>
        <h2 className="text-white text-xl font-black mb-2">
          {followedChars.length > 0 ? `${followedChars.length}人をフォロー！` : '探索完了！'}
        </h2>
        {followedChars.length > 0 && (
          <>
            <p className="text-purple-400 text-xs mb-4 font-medium">まもなくキャラからメッセージが届きます</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6 max-w-sm">
              {followedChars.map(c => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-500/50">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-900 flex items-center justify-center">✨</div>
                    )}
                  </div>
                  <span className="text-white/70 text-[10px] font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => router.push('/explore')}
          className="px-7 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-bold text-sm"
        >
          探すに戻る
        </button>
      </div>
    );
  }

  return (
    <>
    <style>{`
      @keyframes cardEnter {
        from { opacity: 0; transform: scale(0.93); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
    <div className="fixed inset-0 bg-gray-950 z-50 overflow-hidden select-none">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-white/60 text-sm font-medium">
          {currentIndex + 1} / {characters.length}
        </div>
        <div className="w-10" />
      </div>

      {/* Swipe hint overlays — positioned relative to card area */}
      {swipeX > 30 && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center" style={{ top: '60px', bottom: '120px' }}>
          <div className="absolute top-[20%] left-[15%] transform -rotate-12 border-3 border-green-400 rounded-xl px-4 py-2"
            style={{ opacity: Math.min(1, swipeX / 150) }}>
            <span className="text-green-400 text-2xl font-black tracking-wider">FOLLOW</span>
          </div>
        </div>
      )}
      {swipeX < -30 && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center" style={{ top: '60px', bottom: '120px' }}>
          <div className="absolute top-[20%] right-[15%] transform rotate-12 border-3 border-red-400 rounded-xl px-4 py-2"
            style={{ opacity: Math.min(1, Math.abs(swipeX) / 150) }}>
            <span className="text-red-400 text-2xl font-black tracking-wider">SKIP</span>
          </div>
        </div>
      )}

      {/* Card container — centered, 75% scale */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ top: '60px', bottom: '120px' }}>
        <div className="relative w-[82.5%] h-[82.5%] max-w-[396px]" style={{ maxHeight: '72vh' }}>

      {/* Next card (behind) */}
      {nextChar && (
        <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: nextChar.coverUrl
                ? `url(${nextChar.coverUrl})`
                : nextChar.avatarUrl
                ? `url(${nextChar.avatarUrl})`
                : 'linear-gradient(135deg, #4a1a6b, #1a1a2e)',
              transform: `scale(${0.92 + Math.min(0.08, Math.abs(swipeX) / 1500)})`,
              transition: 'transform 0.3s ease',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        </div>
      )}

      {/* Current card — wrapper triggers enter animation on each new card */}
      <div
        key={`card-enter-${currentIndex}`}
        className="absolute inset-0 z-10"
        style={{ animation: 'cardEnter 0.35s cubic-bezier(0.22,1,0.36,1)' }}
      >
      <div
        ref={cardRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden"
        style={{
          transform: `translateX(${swipeX}px) rotate(${rotation}deg)`,
          transition: isAnimating ? 'transform 0.35s ease-out' : 'none',
          opacity: isAnimating ? opacity : 1,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: currentChar.coverUrl
              ? `url(${currentChar.coverUrl})`
              : currentChar.avatarUrl
              ? `url(${currentChar.avatarUrl})`
              : 'linear-gradient(135deg, #6b21a8, #1a1a2e)',
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* Character info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-6 space-y-2">
          <div className="flex items-end gap-3">
            {/* Avatar */}
            {currentChar.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentChar.avatarUrl}
                alt={currentChar.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-xl flex-shrink-0"
              />
            )}
            <div>
              <h2 className="text-2xl font-black text-white drop-shadow-lg">{currentChar.name}</h2>
              <p className="text-xs text-white/60 font-medium">{currentChar.franchise}</p>
            </div>
          </div>
          {currentChar.catchphrases && currentChar.catchphrases.length > 0 ? (
            <p className="text-white/80 text-sm leading-relaxed drop-shadow-md line-clamp-2 italic">
              「{currentChar.catchphrases[0]}」
            </p>
          ) : currentChar.description ? (
            <p className="text-white/70 text-xs leading-relaxed line-clamp-2">
              {currentChar.description}
            </p>
          ) : null}
        </div>
      </div>
      </div>{/* end card-enter wrapper */}

        </div>{/* end card container inner */}
      </div>{/* end card container */}

      {/* Bottom action buttons */}
      <div className="absolute bottom-14 left-0 right-0 z-30 flex items-center justify-center gap-8 px-6 pb-4">
        {/* Skip button */}
        <button
          onClick={() => swipeOut('left')}
          disabled={isAnimating}
          className="w-16 h-16 rounded-full bg-gray-800/80 border-2 border-red-400/40 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Chat button (center — メインアクション) */}
        <button
          onClick={() => {
            if (currentChar) {
              // フォロー + チャットに直行
              fetch(`/api/relationship/${currentChar.slug}/follow`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                  if (data.isFollowing) {
                    fetch(`/api/relationship/${currentChar.slug}/follow-welcome`, { method: 'POST' }).catch(() => {});
                  }
                })
                .catch(() => {});
              setFollowedIds(prev => [...prev, currentChar.id]);
              router.push(`/chat/${currentChar.id}`);
            }
          }}
          disabled={isAnimating}
          className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-900/40 active:scale-90 transition-transform border-2 border-white/20"
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Follow button (right) */}
        <button
          onClick={() => swipeOut('right')}
          disabled={isAnimating}
          className="w-16 h-16 rounded-full bg-gray-800/80 border-2 border-green-400/40 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <svg className="w-7 h-7 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Instruction */}
      <div className="absolute bottom-8 left-0 right-0 z-30 text-center">
        <p className="text-white/25 text-[10px]">← スキップ ・ チャット ・ フォロー → </p>
      </div>
    </div>
    </>
  );
}
