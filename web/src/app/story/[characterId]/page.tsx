'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Choice {
  text: string;
  consequence: string;
  nextTease?: string;
}

interface ChapterData {
  id: string;
  chapterNumber: number;
  title: string;
  synopsis: string | null;
  choices: Choice[] | null;
  unlockLevel: number;
  isFcOnly: boolean;
  isLocked: boolean;
  lockReason: string | null;
  isCompleted: boolean;
  choicesMade: { choiceIndex: number; consequence: string; selectedAt: string }[];
  startedAt: string | null;
  completedAt: string | null;
}

interface StoryData {
  chapters: ChapterData[];
  characterName: string;
  userLevel: number;
  isFcMember: boolean;
}

interface ToastMsg {
  message: string;
  visible: boolean;
}

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;

  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<ChapterData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastMsg>({ message: '', visible: false });

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 4000);
  }, []);

  const fetchStory = useCallback(async () => {
    try {
      const res = await fetch(`/api/story/${characterId}`);
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json() as StoryData;
      setStoryData(data);
    } catch (err) {
      console.error('Failed to fetch story:', err);
    } finally {
      setLoading(false);
    }
  }, [characterId, router]);

  useEffect(() => {
    void fetchStory();
  }, [fetchStory]);

  const handleChoiceSubmit = async (chapter: ChapterData, choiceIndex: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/story/${characterId}/choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapter.id, choiceIndex }),
      });
      const data = await res.json() as { consequence?: string; nextTease?: string };
      if (res.ok) {
        const choiceText = chapter.choices?.[choiceIndex]?.consequence ?? '';
        showToast(`${choiceText} — この選択は${storyData?.characterName ?? 'キャラ'}に影響します`);
        setSelectedChapter(null);
        // データ更新
        await fetchStory();
        // デイリーミッション: story_read 自動完了（1セッション1回）
        if (!sessionStorage.getItem('mission_triggered_story_read')) {
          sessionStorage.setItem('mission_triggered_story_read', '1');
          fetch('/api/missions/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: 'story_read' }),
          }).catch(() => {/* ignore */});
        }
      } else {
        showToast('エラーが発生しました');
      }
    } catch {
      showToast('エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!storyData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">ストーリーが見つかりませんでした</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* 背景グラデーション（キャラの色調）*/}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(220,38,38,0.15) 0%, rgba(17,24,39,0) 60%), radial-gradient(ellipse at bottom-right, rgba(251,146,60,0.1) 0%, transparent 50%)',
        }}
      />

      {/* ヘッダー */}
      <header className="relative z-10 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="戻る"
          >
            ← 戻る
          </button>
          <div>
            <h1 className="text-white font-bold text-xl">
              {storyData.characterName}のストーリー
            </h1>
            <p className="text-gray-400 text-sm">
              Lv{storyData.userLevel}
              {storyData.isFcMember && ' · FC会員'}
            </p>
          </div>
        </div>
      </header>

      {/* チャプター一覧 */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-4">
        {storyData.chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            characterName={storyData.characterName}
            onOpen={() => !chapter.isLocked && setSelectedChapter(chapter)}
          />
        ))}
      </main>

      {/* チャプター詳細モーダル */}
      {selectedChapter && (
        <ChapterModal
          chapter={selectedChapter}
          characterName={storyData.characterName}
          submitting={submitting}
          onClose={() => setSelectedChapter(null)}
          onChoiceSubmit={(choiceIndex) => handleChoiceSubmit(selectedChapter, choiceIndex)}
        />
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-600 text-white rounded-xl px-5 py-3 shadow-2xl max-w-sm text-center text-sm animate-fade-in">
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── ChapterCard ───────────────────────────────────────────────
function ChapterCard({
  chapter,
  characterName,
  onOpen,
}: {
  chapter: ChapterData;
  characterName: string;
  onOpen: () => void;
}) {
  const isLocked = chapter.isLocked;

  return (
    <button
      onClick={onOpen}
      disabled={isLocked}
      className={`w-full text-left rounded-2xl border transition-all duration-200 p-5 ${
        isLocked
          ? 'border-gray-800 bg-gray-900/40 cursor-not-allowed opacity-70'
          : 'border-gray-700 bg-gray-900/70 hover:border-red-500/50 hover:bg-gray-800/80 cursor-pointer active:scale-[0.98]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* チャプター番号 */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
            isLocked
              ? 'bg-gray-800 text-gray-500'
              : chapter.isCompleted
              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}
        >
          {chapter.isCompleted ? '✅' : `Ch${chapter.chapterNumber}`}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-bold text-base ${isLocked ? 'text-gray-500' : 'text-white'}`}
            >
              {chapter.title}
            </h3>
            {chapter.isFcOnly && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                FC限定
              </span>
            )}
          </div>

          {isLocked ? (
            <p className="text-gray-500 text-sm">{chapter.lockReason}</p>
          ) : (
            <p className="text-gray-400 text-sm line-clamp-2">{chapter.synopsis}</p>
          )}

          {chapter.isCompleted && !isLocked && (
            <p className="text-green-500 text-xs mt-1">
              {characterName}との特別な記憶になった
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── ChapterModal ──────────────────────────────────────────────
function ChapterModal({
  chapter,
  characterName,
  submitting,
  onClose,
  onChoiceSubmit,
}: {
  chapter: ChapterData;
  characterName: string;
  submitting: boolean;
  onClose: () => void;
  onChoiceSubmit: (choiceIndex: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* モーダル本体 */}
      <div
        className="relative z-50 bg-gray-900 border border-gray-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* タイトル */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 flex-shrink-0 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-sm">
            Ch{chapter.chapterNumber}
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{chapter.title}</h2>
            <p className="text-gray-500 text-xs">
              {characterName}のストーリー · 第{chapter.chapterNumber}章
            </p>
          </div>
        </div>

        {/* あらすじ */}
        <div className="bg-gray-800/60 rounded-2xl p-4">
          <p className="text-gray-300 text-sm leading-relaxed">{chapter.synopsis}</p>
        </div>

        {/* 選択肢 or 完了済み */}
        {chapter.isCompleted ? (
          <div className="text-center py-3">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-green-400 text-sm font-medium">この章は完了済みです</p>
            <p className="text-gray-500 text-xs mt-1">
              あなたの選択は{characterName}に刻まれた
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              あなたはどうする？
            </p>
            {(chapter.choices ?? []).map((choice, idx) => (
              <button
                key={idx}
                onClick={() => onChoiceSubmit(idx)}
                disabled={submitting}
                className="w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-500/50 text-white text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
