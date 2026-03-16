'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StoryChapter {
  id: string;
  title: string;
  synopsis: string;
  unlockLevel: number;
  isFcOnly: boolean;
  isUnlocked: boolean;
  order: number;
}

interface StoryTabProps {
  characterId: string;
}

export function StoryTab({ characterId }: StoryTabProps) {
  const router = useRouter();
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) return;
    setLoading(true);
    fetch(`/api/story/${characterId}`)
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data.chapters) setChapters(data.chapters);
        else setChapters([]);
      })
      .catch(() => {
        setError('ストーリーの読み込みに失敗しました');
        setChapters([]);
      })
      .finally(() => setLoading(false));
  }, [characterId]);

  if (loading) {
    return (
      <div className="pt-10 flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        <p className="text-white/40 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="pt-10 flex flex-col items-center gap-4 pb-24">
        <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <p className="text-white/40 text-sm">ストーリーはまだ公開されていません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2 pb-24">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">ストーリー</p>
      {chapters.map((chapter, index) => {
        const locked = !chapter.isUnlocked;
        return (
          <button
            key={chapter.id}
            onClick={() => {
              if (!locked) router.push(`/story/${characterId}/${chapter.id}`);
            }}
            disabled={locked}
            className={`w-full text-left rounded-2xl border transition-all active:scale-[0.98] ${
              locked
                ? 'bg-gray-900/40 border-white/5 opacity-60 cursor-not-allowed'
                : 'bg-gray-900/80 border-white/10 hover:border-purple-500/40 hover:bg-gray-900'
            }`}
          >
            <div className="p-4 flex gap-4 items-start">
              {/* チャプター番号 */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                locked
                  ? 'bg-gray-800 text-gray-600'
                  : 'bg-purple-900/60 text-purple-300 border border-purple-700/30'
              }`}>
                {locked ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* 本文 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white font-semibold text-sm leading-tight">{chapter.title}</span>
                  {chapter.isFcOnly && (
                    <span className="text-xs bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-700/30 leading-none">
                      FC限定
                    </span>
                  )}
                </div>
                {chapter.synopsis && (
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{chapter.synopsis}</p>
                )}
                {locked && (
                  <p className="text-gray-600 text-xs mt-1">
                    Lv.{chapter.unlockLevel} で解放
                    {chapter.isFcOnly ? ' (FC限定)' : ''}
                  </p>
                )}
              </div>

              {/* 矢印 */}
              {!locked && (
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
