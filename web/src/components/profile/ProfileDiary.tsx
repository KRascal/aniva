'use client';

import type { DiaryItem } from '@/app/profile/[characterId]/profile-data';

export interface ProfileDiaryProps {
  diaries: DiaryItem[];
  diaryLoading: boolean;
  diaryPage: number;
  diaryTotalPages: number;
  onPageChange: (page: number) => void;
  onDiaryLike: (diaryId: string) => void;
}

const MOOD_CONFIG: Record<string, { emoji: string; gradient: string; badge: string }> = {
  happy:      { emoji: '😊', gradient: 'from-yellow-900/40 to-orange-900/30', badge: 'bg-yellow-500/20 text-yellow-300' },
  sad:        { emoji: '😢', gradient: 'from-blue-900/40 to-indigo-900/30', badge: 'bg-blue-500/20 text-blue-300' },
  excited:    { emoji: '🤩', gradient: 'from-pink-900/40 to-red-900/30', badge: 'bg-pink-500/20 text-pink-300' },
  tired:      { emoji: '😴', gradient: 'from-gray-800/60 to-gray-900/40', badge: 'bg-gray-500/20 text-gray-400' },
  neutral:    { emoji: '😐', gradient: 'from-gray-800/50 to-gray-900/40', badge: 'bg-gray-500/20 text-gray-400' },
  nostalgic:  { emoji: '🌙', gradient: 'from-purple-900/40 to-violet-900/30', badge: 'bg-purple-500/20 text-purple-300' },
  mysterious: { emoji: '🔮', gradient: 'from-indigo-900/40 to-purple-900/30', badge: 'bg-indigo-500/20 text-indigo-300' },
  playful:    { emoji: '😜', gradient: 'from-green-900/40 to-teal-900/30', badge: 'bg-green-500/20 text-green-300' },
};

export function ProfileDiary({
  diaries,
  diaryLoading,
  diaryPage,
  diaryTotalPages,
  onPageChange,
  onDiaryLike,
}: ProfileDiaryProps) {
  return (
    <div className="space-y-3 pt-2 pb-24">
      {diaryLoading && diaries.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">読み込み中...</div>
      ) : diaries.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-3">
            <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">まだ日記がありません</p>
        </div>
      ) : (
        <>
          {diaries.map((diary) => {
            const cfg = MOOD_CONFIG[diary.mood] ?? MOOD_CONFIG['neutral'];
            return (
              <div
                key={diary.id}
                className={`rounded-2xl p-4 bg-gradient-to-br ${cfg.gradient} border border-white/10`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{cfg.emoji}</span>
                  <div className="flex-1">
                    <span className="text-white/50 text-xs">{diary.date}</span>
                    <div className="mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                        {diary.mood}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">{diary.content}</p>
                <div className="flex items-center gap-1 mt-3">
                  <button
                    onClick={() => onDiaryLike(diary.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all border ${
                      diary.isLiked
                        ? 'bg-pink-600/30 border-pink-500/50 text-pink-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill={diary.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    <span>{diary.likes}</span>
                  </button>
                </div>
              </div>
            );
          })}
          {diaryPage < diaryTotalPages && (
            <button
              onClick={() => onPageChange(diaryPage + 1)}
              disabled={diaryLoading}
              className="w-full py-3 text-sm text-white/50 hover:text-white/80 border border-white/10 rounded-2xl transition-colors"
            >
              {diaryLoading ? '読み込み中...' : 'もっと見る'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
