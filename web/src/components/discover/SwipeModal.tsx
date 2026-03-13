'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track, EVENTS } from '@/lib/analytics';

interface SwipeCharacter {
  id: string;
  slug: string;
  name: string;
  franchise: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[] | null;
  description: string | null;
}

interface SwipeModalProps {
  onClose: () => void;
}

export function SwipeModal({ onClose }: SwipeModalProps) {
  const router = useRouter();
  const [characters, setCharacters] = useState<SwipeCharacter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // フォロー済みキャラIDを取得してclient-sideでも除外する（API認証漏れ対策）
        const [charRes, followRes] = await Promise.all([
          fetch('/api/characters?limit=30&random=1&excludeFollowing=true', { credentials: 'include' }),
          fetch('/api/characters?followingOnly=true', { credentials: 'include' }),
        ]);
        let followedCharIds: string[] = [];
        if (followRes.ok) {
          const followData = await followRes.json();
          followedCharIds = (followData.characters ?? []).map((c: { id: string }) => c.id);
        }
        if (charRes.ok) {
          const data = await charRes.json();
          const chars = (data.characters ?? [])
            .filter((c: { id: string }) => !followedCharIds.includes(c.id))
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
          setCharacters(chars);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const swipeOut = useCallback((direction: 'left' | 'right') => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    setSwipeDirection(direction);
    setSwipeX(direction === 'left' ? -400 : 400);

    const char = characters[currentIndexRef.current];
    track(EVENTS.TINDER_SWIPE, { direction, characterId: char?.id, characterSlug: char?.slug });

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
    }, 300);
  }, [characters]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimatingRef.current) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimatingRef.current) return;
    setSwipeX(e.touches[0].clientX - touchStartRef.current.x);
  };
  const handleTouchEnd = () => {
    if (!touchStartRef.current || isAnimatingRef.current) return;
    if (swipeX > 80) swipeOut('right');
    else if (swipeX < -80) swipeOut('left');
    else setSwipeX(0);
    touchStartRef.current = null;
  };

  // Mouse events
  const mouseStartRef = useRef<{ x: number } | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimatingRef.current) return;
    mouseStartRef.current = { x: e.clientX };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current || isAnimatingRef.current) return;
    setSwipeX(e.clientX - mouseStartRef.current.x);
  };
  const handleMouseUp = () => {
    if (!mouseStartRef.current || isAnimatingRef.current) return;
    if (swipeX > 80) swipeOut('right');
    else if (swipeX < -80) swipeOut('left');
    else setSwipeX(0);
    mouseStartRef.current = null;
  };

  currentIndexRef.current = currentIndex;
  const currentChar = characters[currentIndex];
  const nextChar = characters[currentIndex + 1];
  const rotation = swipeX * 0.06;
  const isComplete = !currentChar || currentIndex >= characters.length;

  // 完了時にgreet送信
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
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <div className="animate-pulse text-white/40 text-lg">読み込み中...</div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-[72px] z-40 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center px-6">
        <div className="text-4xl mb-4">💌</div>
        <h2 className="text-white text-xl font-black mb-2">
          {followedIds.length > 0 ? `${followedIds.length}人をフォロー！` : '完了！'}
        </h2>
        {followedIds.length > 0 && (
          <p className="text-purple-400 text-xs mb-4">まもなくメッセージが届きます</p>
        )}
        <button
          onClick={onClose}
          className="px-7 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-bold text-sm"
        >
          探索に戻る
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes modalCardEnter {
          from { opacity: 0; transform: scale(0.93); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* Backdrop — bottom-[72px] でアンダーバーの上まで */}
      <div className="fixed inset-x-0 top-0 bottom-[72px] z-40 bg-black/70 backdrop-blur-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-white/60 text-sm font-medium">
            新しいキャラ {currentIndex + 1} / {characters.length}
          </div>
          <button
            onClick={onClose}
            className="text-white/50 text-sm font-medium px-3 py-1"
          >
            スキップ
          </button>
        </div>

        {/* Card area */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="relative w-full max-w-[340px]" style={{ height: '55vh', maxHeight: '480px' }}>
            {/* Next card */}
            {nextChar && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ transform: 'scale(0.95)', opacity: 0.5 }}>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: nextChar.coverUrl ? `url(${nextChar.coverUrl})` : nextChar.avatarUrl ? `url(${nextChar.avatarUrl})` : 'linear-gradient(135deg, #4a1a6b, #1a1a2e)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              </div>
            )}

            {/* Current card */}
            <div
              key={`modal-card-${currentIndex}`}
              style={{ animation: 'modalCardEnter 0.3s ease-out' }}
              className="absolute inset-0"
            >
              <div
                className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden"
                style={{
                  transform: `translateX(${swipeX}px) rotate(${rotation}deg)`,
                  transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Swipe hints */}
                {swipeX > 30 && (
                  <div className="absolute top-8 left-6 z-20 border-2 border-green-400 rounded-xl px-3 py-1 -rotate-12"
                    style={{ opacity: Math.min(1, swipeX / 120) }}>
                    <span className="text-green-400 text-xl font-black">FOLLOW</span>
                  </div>
                )}
                {swipeX < -30 && (
                  <div className="absolute top-8 right-6 z-20 border-2 border-red-400 rounded-xl px-3 py-1 rotate-12"
                    style={{ opacity: Math.min(1, Math.abs(swipeX) / 120) }}>
                    <span className="text-red-400 text-xl font-black">SKIP</span>
                  </div>
                )}

                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: currentChar.coverUrl ? `url(${currentChar.coverUrl})` : currentChar.avatarUrl ? `url(${currentChar.avatarUrl})` : 'linear-gradient(135deg, #6b21a8, #1a1a2e)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5 space-y-1.5">
                  <div className="flex items-end gap-2.5">
                    {currentChar.avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-xl flex-shrink-0">
                        <img src={currentChar.avatarUrl} alt={currentChar.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-black text-white drop-shadow-lg">{currentChar.name}</h2>
                      <p className="text-[11px] text-white/60 font-medium">{currentChar.franchise}</p>
                    </div>
                  </div>
                  {currentChar.catchphrases?.[0] && (
                    <p className="text-white/80 text-sm leading-relaxed italic line-clamp-2">「{currentChar.catchphrases[0]}」</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-7 py-4 px-6">
          <button
            onClick={() => swipeOut('left')}
            disabled={isAnimating}
            className="w-14 h-14 rounded-full bg-gray-800/80 border-2 border-red-400/40 flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (currentChar) {
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
            className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl active:scale-90 transition-transform border-2 border-white/20"
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button
            onClick={() => swipeOut('right')}
            disabled={isAnimating}
            className="w-14 h-14 rounded-full bg-gray-800/80 border-2 border-green-400/40 flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>

        <p className="text-center text-white/20 text-[10px] pb-2">← スキップ ・ チャット ・ フォロー →</p>
      </div>
    </>
  );
}
