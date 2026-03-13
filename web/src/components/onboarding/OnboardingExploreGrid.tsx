'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GridCharacter {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  coverUrl?: string | null;
  description?: string | null;
  catchphrases?: string[];
}

interface OnboardingExploreGridProps {
  onChatSelect: (characterId: string, followedIds: string[]) => void;
  onFollowsComplete: (followedIds: string[]) => void;
  isLoading?: boolean;
}

/**
 * オンボーディング用キャラ選択グリッド
 * explore/discoverと同じカードUI + フォロー & チャットボタン
 */
export default function OnboardingExploreGrid({
  onChatSelect,
  onFollowsComplete,
  isLoading,
}: OnboardingExploreGridProps) {
  const [characters, setCharacters] = useState<GridCharacter[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [fetchLoading, setFetchLoading] = useState(true);
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/characters?limit=20');
        if (res.ok) {
          const data = await res.json();
          setCharacters(data.characters ?? data ?? []);
        }
      } catch { /* ignore */ }
      setFetchLoading(false);
    })();
  }, []);

  const handleFollow = useCallback(async (charId: string, slug: string) => {
    if (followingInProgress.has(charId)) return;
    setFollowingInProgress(prev => new Set(prev).add(charId));

    const isCurrentlyFollowed = followedIds.has(charId);
    
    try {
      if (isCurrentlyFollowed) {
        await fetch(`/api/relationship/${slug}/follow`, { method: 'DELETE' });
        setFollowedIds(prev => {
          const next = new Set(prev);
          next.delete(charId);
          return next;
        });
      } else {
        const res = await fetch(`/api/relationship/${slug}/follow`, { method: 'POST' });
        if (res.ok) {
          setFollowedIds(prev => new Set(prev).add(charId));
        }
      }
    } catch { /* ignore */ }
    
    setFollowingInProgress(prev => {
      const next = new Set(prev);
      next.delete(charId);
      return next;
    });
  }, [followedIds, followingInProgress]);

  const handleChat = useCallback((charId: string) => {
    // チャット選択時、フォロー済みキャラも渡す
    onChatSelect(charId, Array.from(followedIds));
  }, [onChatSelect, followedIds]);

  const handleSkip = useCallback(() => {
    onFollowsComplete(Array.from(followedIds));
  }, [followedIds, onFollowsComplete]);

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

  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="relative z-30 pt-safe-top px-5 pt-4 pb-3">
        <h1 className="text-white font-black text-lg mb-1">気になるキャラを見つけよう</h1>
        <p className="text-white/40 text-xs">フォローして、推しとトークしよう</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        <div className="grid grid-cols-2 gap-2.5">
          {characters.map((char, i) => {
            const isFollowed = followedIds.has(char.id);
            const catchphrase = char.catchphrases?.[0] || '';

            return (
              <motion.div
                key={char.id}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  aspectRatio: '3/4',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                {/* Background image */}
                {(char.coverUrl || char.avatarUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={char.coverUrl || char.avatarUrl || ''}
                    alt={char.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-gray-900" />
                )}

                {/* Online dot */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] text-green-300/80 font-medium">ONLINE</span>
                </div>

                {/* Bottom overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-3"
                  style={{
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                  }}
                >
                  {/* Franchise */}
                  <p className="text-white/40 text-[10px] font-medium mb-0.5">{char.franchise}</p>
                  
                  {/* Name */}
                  <p className="text-white font-bold text-sm leading-tight mb-1">{char.name}</p>

                  {/* Catchphrase */}
                  {catchphrase && (
                    <p className="text-white/50 text-[10px] leading-tight line-clamp-1 mb-2 italic">
                      &ldquo;{catchphrase}&rdquo;
                    </p>
                  )}

                  {/* Follow button */}
                  <button
                    onClick={() => handleFollow(char.id, char.slug)}
                    disabled={followingInProgress.has(char.id)}
                    className={`w-full px-3 py-1.5 text-xs font-bold rounded-full transition-all active:scale-95 mb-1.5 ${
                      isFollowed
                        ? 'bg-white/10 text-white/60 border border-white/20'
                        : 'bg-white text-black'
                    }`}
                  >
                    {followingInProgress.has(char.id) ? '...' : isFollowed ? 'フォロー中' : 'フォローする'}
                  </button>

                  {/* Chat button */}
                  <button
                    onClick={() => handleChat(char.id)}
                    disabled={isLoading}
                    className="w-full px-3 py-1.5 text-xs font-bold text-white rounded-full transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                      boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
                    }}
                  >
                    {isLoading ? '準備中...' : 'チャット →'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Skip button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-5 pb-safe-bottom pb-4 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }}
      >
        <button
          onClick={handleSkip}
          className="w-full py-3 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          スキップして始める
        </button>
      </div>
    </motion.div>
  );
}
