'use client';

import { useState } from 'react';
import { track, EVENTS } from '@/lib/analytics';

export interface FollowButtonProps {
  characterId: string;
  initialFollowing: boolean;
  onFollow: (id: string, following: boolean) => void;
}

export function FollowButton({
  characterId,
  initialFollowing,
  onFollow,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: !following }),
      });
      if (res.ok) {
        const newFollowing = !following;
        setFollowing(newFollowing);
        onFollow(characterId, newFollowing);
        if (newFollowing) {
          track(EVENTS.CHARACTER_FOLLOWED, { characterId });
          // フォロー時にウェルカムメッセージ送信
          fetch(`/api/relationship/${characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95
        ${following
          ? 'bg-white/10 text-white border border-white/25 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/40 hover:scale-105'
          : 'text-white hover:scale-105'
        }
        ${loading ? 'opacity-50' : ''}
      `}
      style={!following ? {
        background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
        boxShadow: '0 2px 12px rgba(139,92,246,0.4)',
      } : undefined}
    >
      {loading ? '…' : following ? 'フォロー中' : 'フォローする'}
    </button>
  );
}
