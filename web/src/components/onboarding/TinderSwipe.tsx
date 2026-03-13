'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

// ---- Types ----
interface SwipeCharacter {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  description?: string | null;
  catchphrases?: string[];
}

interface TinderSwipeProps {
  onComplete: (followedIds: string[]) => void;
  isLoading?: boolean;
}

// ---- SwipeCard ----
function SwipeCard({
  character,
  onSwipe,
  isTop,
}: {
  character: SwipeCharacter;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
    }
  };

  // ランダムなキャッチフレーズ
  const catchphrase = character.catchphrases?.[0] || '';

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate, zIndex: isTop ? 10 : 1 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7 }}
      exit={{
        x: 300,
        opacity: 0,
        rotate: 15,
        transition: { duration: 0.3 },
      }}
    >
      <div
        className="w-full h-full rounded-2xl overflow-hidden relative select-none"
        style={{
          boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* キャラクター画像 */}
        {character.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-gray-900 flex items-center justify-center">
            <span className="text-5xl">✨</span>
          </div>
        )}

        {/* 下部グラデーション + キャラ情報 */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10"
          style={{
            background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.95) 100%)',
          }}
        >
          <h2 className="text-white text-lg font-black mb-0.5">{character.name}</h2>
          <p className="text-white/40 text-xs font-medium mb-1">{character.franchise}</p>
          {catchphrase && (
            <p className="text-white/60 text-xs italic leading-relaxed line-clamp-2">「{catchphrase}」</p>
          )}
        </div>

        {/* FOLLOW スタンプ */}
        <motion.div
          className="absolute top-5 left-4 px-3 py-1.5 rounded-lg border-3 border-green-400 z-20"
          style={{ opacity: likeOpacity, rotate: -15 }}
        >
          <span className="text-green-400 text-xl font-black tracking-wider">FOLLOW</span>
        </motion.div>

        {/* SKIP スタンプ */}
        <motion.div
          className="absolute top-5 right-4 px-3 py-1.5 rounded-lg border-3 border-red-400 z-20"
          style={{ opacity: nopeOpacity, rotate: 15 }}
        >
          <span className="text-red-400 text-xl font-black tracking-wider">SKIP</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---- Main Component ----
export default function TinderSwipe({ onComplete, isLoading, onSelectCharacter }: TinderSwipeProps & { onSelectCharacter?: (charId: string) => void }) {
  const [characters, setCharacters] = useState<SwipeCharacter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showResult, setShowResult] = useState(false);

  // キャラクター取得（10体）
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const res = await fetch('/api/characters?limit=10');
        if (res.ok) {
          const data = await res.json();
          const chars: SwipeCharacter[] = (data.characters ?? data ?? []).map((c: Record<string, unknown>) => ({
            id: c.id as string,
            name: c.name as string,
            nameEn: c.nameEn as string | null,
            slug: c.slug as string,
            franchise: c.franchise as string,
            avatarUrl: (c.avatarUrl as string | null) ?? null,
            description: (c.description as string | null) ?? null,
            catchphrases: (c.catchphrases as string[]) ?? [],
          }));
          setCharacters(chars);
        }
      } catch {
        // ignore
      } finally {
        setFetchLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const char = characters[currentIndex];
    if (!char) return;

    setSwipeDirection(direction);

    if (direction === 'right') {
      setFollowedIds(prev => [...prev, char.id]);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= characters.length) {
        setShowResult(true);
      } else {
        setCurrentIndex(nextIndex);
      }
    }, 300);
  }, [characters, currentIndex]);

  // ボタンでのスワイプ
  const handleButtonSwipe = useCallback((direction: 'left' | 'right') => {
    handleSwipe(direction);
  }, [handleSwipe]);

  // 結果画面でキャラをタップ → そのキャラを先頭にして完了
  const [selectedCharForChat, setSelectedCharForChat] = useState<string | null>(null);

  // 結果確定
  const handleConfirm = useCallback(() => {
    // 選択されたキャラを先頭に並べ替え
    if (selectedCharForChat && followedIds.includes(selectedCharForChat)) {
      const reordered = [selectedCharForChat, ...followedIds.filter(id => id !== selectedCharForChat)];
      onComplete(reordered);
    } else {
      onComplete(followedIds);
    }
  }, [followedIds, onComplete, selectedCharForChat]);

  // ---- Loading ----
  if (fetchLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">キャラクターを探しています...</p>
        </div>
      </div>
    );
  }

  // ---- Result Screen ----
  if (showResult) {
    const followedChars = characters.filter(c => followedIds.includes(c.id));
    return (
      <motion.div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-4xl mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.5, times: [0, 0.6, 1] }}
        >
          💌
        </motion.div>
        <h2 className="text-white text-xl font-black mb-1">フォロー完了！</h2>
        <p className="text-white/50 text-sm mb-2">
          {followedChars.length > 0
            ? `${followedChars.length}人のキャラがあなたを待ってる`
            : 'あとからフォローもできます'}
        </p>
        {followedChars.length > 0 && (
          <motion.p
            className="text-purple-400 text-xs mb-6 font-medium"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            ✉️ まもなくキャラからメッセージが届きます
          </motion.p>
        )}

        {followedChars.length > 0 ? (
          <>
            <p className="text-white/40 text-xs mb-3">タップして最初に話すキャラを選ぼう</p>
            <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-sm">
              {followedChars.map((c, i) => {
                const isSelected = selectedCharForChat === c.id || (!selectedCharForChat && i === 0);
                return (
                  <motion.button
                    key={c.id}
                    className="flex flex-col items-center gap-1"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    onClick={() => setSelectedCharForChat(c.id)}
                  >
                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-purple-400 ring-2 ring-purple-500/50 scale-110' : 'border-white/20'
                    }`}>
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-900 flex items-center justify-center text-lg">✨</div>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-purple-300' : 'text-white/70'}`}>{c.name}</span>
                    {isSelected && <span className="text-[9px] text-purple-400">💬</span>}
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-white/30 text-sm mb-8">
            スキップしたキャラも後からフォローできます
          </p>
        )}

        <motion.button
          onClick={handleConfirm}
          disabled={isLoading}
          className="px-7 py-3.5 rounded-2xl font-bold text-white text-sm relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              準備中...
            </span>
          ) : (
            '始める ✨'
          )}
        </motion.button>
      </motion.div>
    );
  }

  // ---- Main Swipe UI ----
  const currentChar = characters[currentIndex];
  const nextChar = characters[currentIndex + 1];
  const progress = characters.length > 0 ? ((currentIndex) / characters.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="relative z-30 pt-safe-top px-5 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-white font-black text-base">気になるキャラをフォロー</h1>
          <span className="text-white/40 text-xs font-bold">{currentIndex + 1}/{characters.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card stack area */}
      <div className="flex-1 relative px-5 py-2">
        <div className="relative w-full h-full max-w-[280px] mx-auto" style={{ maxHeight: '55vh' }}>
          <AnimatePresence>
            {/* Next card (behind) */}
            {nextChar && (
              <SwipeCard
                key={`next-${nextChar.id}`}
                character={nextChar}
                onSwipe={() => {}}
                isTop={false}
              />
            )}
            {/* Current card (top) */}
            {currentChar && !swipeDirection && (
              <SwipeCard
                key={`current-${currentChar.id}`}
                character={currentChar}
                onSwipe={handleSwipe}
                isTop={true}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      <div className="relative z-30 pb-safe-bottom px-6 pb-4 flex items-center justify-center gap-5">
        {/* Skip button */}
        <motion.button
          onClick={() => handleButtonSwipe('left')}
          className="w-13 h-13 rounded-full flex items-center justify-center"
          style={{
            width: 52, height: 52,
            background: 'rgba(255,255,255,0.06)',
            border: '2px solid rgba(239,68,68,0.4)',
          }}
          whileTap={{ scale: 0.85 }}
        >
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        {/* Follow button */}
        <motion.button
          onClick={() => handleButtonSwipe('right')}
          className="rounded-full flex items-center justify-center"
          style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
          }}
          whileTap={{ scale: 0.85 }}
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </motion.button>

        {/* Info button */}
        <motion.button
          onClick={() => handleButtonSwipe('left')}
          className="rounded-full flex items-center justify-center"
          style={{
            width: 52, height: 52,
            background: 'rgba(255,255,255,0.06)',
            border: '2px solid rgba(59,130,246,0.4)',
          }}
          whileTap={{ scale: 0.85 }}
        >
          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
