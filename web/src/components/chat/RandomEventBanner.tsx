'use client';

import type { RandomEvent } from '@/lib/random-events';

interface RandomEventBannerProps {
  randomEvent: RandomEvent | null;
}

export function RandomEventBanner({ randomEvent }: RandomEventBannerProps) {
  if (!randomEvent) return null;

  return (
    <div className="mx-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/60 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">{randomEvent.emoji}</span>
        <div>
          <p className="text-xs font-black text-purple-300 uppercase tracking-wider">{randomEvent.title}</p>
          <p className="text-sm text-white/80 italic">「{randomEvent.message}」</p>
          {randomEvent.coinReward && (
            <p className="text-xs text-yellow-400 mt-0.5">🪙 +{randomEvent.coinReward} コイン</p>
          )}
        </div>
      </div>
    </div>
  );
}
