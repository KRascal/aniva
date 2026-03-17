'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { type StoryItem } from './InstaStoriesBar';

export function StoryViewer({ stories, initialIndex, onClose, onChat }: {
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
            {story.avatarUrl && <Image src={story.avatarUrl} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />}
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
          <Image src={story.coverUrl} alt={story.name} fill className="object-cover" draggable={false} unoptimized />
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
