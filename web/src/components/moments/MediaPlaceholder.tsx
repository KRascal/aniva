'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

/* ────────────────────────────────── Wave heights ── */

const MOMENT_WAVE_HEIGHTS = [20, 35, 50, 65, 45, 70, 55, 30, 60, 80, 45, 65, 35, 55, 75, 40, 60, 50, 70, 35, 55, 65, 45, 30, 55, 70, 40, 25];

/* ────────────────────────────────── MediaPlaceholder ── */

export function MediaPlaceholder({
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
            <Image src={mediaUrl} alt="" width={0} height={0} sizes="100vw" className="w-full object-cover" style={{ height: 'auto', maxHeight: 360 }} unoptimized />
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
          <button className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0 hover:scale-110 active:scale-95 transition-transform">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
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
