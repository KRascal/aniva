'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface DiaryEntry {
  id: string;
  characterId: string;
  date: string;
  content: string;
  mood: string;
  imageUrl: string | null;
  likes: number;
  isLiked: boolean;
  createdAt: string;
}

interface DiaryResponse {
  diaries: DiaryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Character {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  franchise: string;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  excited: '🔥',
  tired: '😴',
  neutral: '😐',
  angry: '😤',
  love: '💕',
  mysterious: '🌙',
  nostalgic: '🌸',
};

function getMoodLabel(mood: string): string {
  const labels: Record<string, string> = {
    happy: '幸せ',
    sad: '切ない',
    excited: '興奮',
    tired: '疲れた',
    neutral: 'ふつう',
    angry: 'むかっ',
    love: '恋心',
    mysterious: '神秘的',
    nostalgic: '懐かしい',
  };
  return labels[mood] ?? mood;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export default function DiaryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const characterId = params?.characterId as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);

  // キャラ情報取得
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/${characterId}`)
      .then((r) => r.json())
      .then((data) => setCharacter(data.character ?? data))
      .catch(console.error);
  }, [characterId]);

  // 日記取得
  const fetchDiaries = useCallback(
    async (pageNum: number, append = false) => {
      if (!characterId) return;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(`/api/diary/${characterId}?page=${pageNum}&limit=10`);
        if (!res.ok) throw new Error('fetch error');
        const data: DiaryResponse = await res.json();
        setDiaries((prev) => (append ? [...prev, ...data.diaries] : data.diaries));
        setTotalPages(data.pagination.totalPages);
        setPage(pageNum);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [characterId]
  );

  useEffect(() => {
    fetchDiaries(1);
  }, [fetchDiaries]);

  // いいね
  const handleLike = async (diary: DiaryEntry) => {
    if (!session) { router.push('/login'); return; }
    if (likeLoading === diary.id) return;
    setLikeLoading(diary.id);

    try {
      const res = await fetch(`/api/diary/${characterId}/${diary.id}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('like failed');
      const { liked, likes } = await res.json();
      setDiaries((prev) =>
        prev.map((d) => (d.id === diary.id ? { ...d, isLiked: liked, likes } : d))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLikeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {character?.avatarUrl ? (
            <img src={character.avatarUrl} alt={character.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              {character?.name?.[0] ?? '?'}
            </div>
          )}

          <div>
            <h1 className="font-bold text-sm">{character?.name ?? ''} の日記</h1>
            <p className="text-zinc-400 text-xs">{diaries.length > 0 ? `${diaries.length}件` : '記録なし'}</p>
          </div>
        </div>
      </div>

      {/* 日記リスト */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {diaries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📔</div>
            <p className="text-zinc-400 text-sm">まだ日記がありません</p>
            <p className="text-zinc-600 text-xs mt-1">チャットを重ねると日記が生まれます</p>
          </div>
        ) : (
          diaries.map((diary) => (
            <article
              key={diary.id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              {/* 日付ヘッダー */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xl" title={getMoodLabel(diary.mood)}>
                    {MOOD_EMOJI[diary.mood] ?? '📝'}
                  </span>
                  <div>
                    <p className="text-xs text-zinc-400">{formatDate(diary.date)}</p>
                    <p className="text-xs text-zinc-600">{getMoodLabel(diary.mood)}</p>
                  </div>
                </div>
                {/* いいね */}
                <button
                  onClick={() => handleLike(diary)}
                  disabled={likeLoading === diary.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    diary.isLiked
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  <span>{diary.isLiked ? '❤️' : '🤍'}</span>
                  <span>{diary.likes}</span>
                </button>
              </div>

              {/* 画像 */}
              {diary.imageUrl && (
                <img
                  src={diary.imageUrl}
                  alt="diary"
                  className="w-full aspect-video object-cover"
                />
              )}

              {/* 本文 */}
              <div className="px-4 py-4">
                <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                  {diary.content}
                </p>
              </div>
            </article>
          ))
        )}

        {/* もっと読む */}
        {page < totalPages && (
          <div className="text-center pt-2">
            <button
              onClick={() => fetchDiaries(page + 1, true)}
              disabled={loadingMore}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-full transition-colors disabled:opacity-50"
            >
              {loadingMore ? '読み込み中...' : 'もっと見る'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
