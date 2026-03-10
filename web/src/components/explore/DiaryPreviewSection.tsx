'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

interface DiaryPreviewEntry {
  id: string;
  characterId: string;
  date: string;
  content: string;
  mood: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
  likes: number;
  isLiked: boolean;
}

const DIARY_MOOD_EMOJI: Record<string, string> = {
  happy: '😊', sad: '😢', excited: '🔥', tired: '😴',
  neutral: '😐', angry: '😤', love: '💕', mysterious: '🌙', nostalgic: '🌸',
};

export function DiaryPreviewSection() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<DiaryPreviewEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/diary?limit=3&page=1')
      .then((r) => r.json())
      .then((data) => {
        setDiaries((data.diaries ?? []).slice(0, 3));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || diaries.length === 0) return null;

  return (
    <FadeSection delay={18}>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            今日の日記
          </h3>
          <button
            onClick={() => router.push('/diary')}
            className="text-xs font-semibold"
            style={{ color: 'rgba(167,139,250,0.85)' }}
          >
            もっと見る →
          </button>
        </div>
        <div className="space-y-2">
          {diaries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => router.push(`/diary/${entry.character.slug}`)}
              className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
              }}
            >
              <div className="px-3.5 py-3 flex items-start gap-3">
                {/* アバター */}
                {entry.character.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.character.avatarUrl}
                    alt={entry.character.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
                    style={{ boxShadow: '0 0 0 1.5px rgba(139,92,246,0.5)' }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
                    {entry.character.name.charAt(0)}
                  </div>
                )}
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-white/80 text-xs font-bold">{entry.character.name}</span>
                    <span className="text-[10px]">{DIARY_MOOD_EMOJI[entry.mood] ?? '📝'}</span>
                    <span className="text-white/25 text-[10px] ml-auto flex-shrink-0">{entry.date}</span>
                  </div>
                  <p
                    className="text-white/55 text-xs leading-relaxed line-clamp-2"
                    style={{ fontFamily: '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", cursive, sans-serif' }}
                  >
                    {entry.content}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {/* 「もっと見る」ボタン */}
        <button
          onClick={() => router.push('/diary')}
          className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: 'rgba(167,139,250,0.85)',
          }}
        >
          日記をもっと見る →
        </button>
      </div>
    </FadeSection>
  );
}
