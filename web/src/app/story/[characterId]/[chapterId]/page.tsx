'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

// ---- Typewriter Hook ----
function useTypewriter(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    function tick() {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
        timerRef.current = setTimeout(tick, speed);
      } else {
        setDone(true);
      }
    }

    timerRef.current = setTimeout(tick, speed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed]);

  const skipToEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayed(text);
    setDone(true);
    indexRef.current = text.length;
  }, [text]);

  return { displayed, done, skipToEnd };
}

export default function StoryChapterPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;
  const chapterId = params.chapterId as string;

  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [choiceResult, setChoiceResult] = useState<{ consequence: string; nextTease?: string } | null>(null);
  const [titleVisible, setTitleVisible] = useState(false);
  const [nextButtonVisible, setNextButtonVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const synopsisText = chapter?.synopsis ?? '';
  const { displayed, done, skipToEnd } = useTypewriter(synopsisText, 28);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/story/${characterId}`);
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json() as StoryData;
      setStoryData(data);
      const found = data.chapters.find((c) => c.id === chapterId);
      setChapter(found ?? null);
    } catch (err) {
      console.error('Failed to fetch story:', err);
    } finally {
      setLoading(false);
    }
  }, [characterId, chapterId, router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Title fade-in after load
  useEffect(() => {
    if (chapter) {
      const t = setTimeout(() => setTitleVisible(true), 200);
      return () => clearTimeout(t);
    }
  }, [chapter]);

  // Show next button after typewriter done
  useEffect(() => {
    if (done && chapter) {
      const t = setTimeout(() => setNextButtonVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, [done, chapter]);

  const handleChoiceSubmit = async (choiceIndex: number) => {
    if (!chapter || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/story/${characterId}/choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapter.id, choiceIndex }),
      });
      const data = await res.json() as { consequence?: string; nextTease?: string };
      if (res.ok) {
        setChoiceResult({
          consequence: chapter.choices?.[choiceIndex]?.consequence ?? '',
          nextTease: data.nextTease,
        });
        // Mission tracking
        if (!sessionStorage.getItem('mission_triggered_story_read')) {
          sessionStorage.setItem('mission_triggered_story_read', '1');
          fetch('/api/missions/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: 'story_read' }),
          }).catch(() => {/* ignore */});
        }
        await fetchData();
        setTimeout(() => setNextButtonVisible(true), 600);
      } else {
        showToast('エラーが発生しました');
      }
    } catch {
      showToast('エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  // Navigate to next chapter
  const goToNextChapter = () => {
    if (!storyData || !chapter) return;
    const currentIdx = storyData.chapters.findIndex((c) => c.id === chapterId);
    const next = storyData.chapters[currentIdx + 1];
    if (next && !next.isLocked) {
      router.push(`/story/${characterId}/${next.id}`);
    } else {
      router.push(`/story/${characterId}`);
    }
  };

  // Derived state
  const totalChapters = storyData?.chapters.length ?? 0;
  const currentChapterNumber = chapter?.chapterNumber ?? 1;
  const progressPct = totalChapters > 0 ? (currentChapterNumber / totalChapters) * 100 : 0;
  const themeColor = '#7c3aed'; // purple default (Character has no themeColor field)
  const currentIdx = storyData ? storyData.chapters.findIndex((c) => c.id === chapterId) : -1;
  const nextChapter = currentIdx >= 0 && storyData ? storyData.chapters[currentIdx + 1] : null;
  const hasNextChapter = !!nextChapter;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!chapter || chapter.isLocked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
        <div className="text-5xl">🔒</div>
        <p className="text-gray-400 text-lg">{chapter?.lockReason ?? 'このチャプターはロックされています'}</p>
        <button
          onClick={() => router.push(`/story/${characterId}`)}
          className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold transition-colors"
        >
          ← ストーリー一覧へ
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: ${progressPct}%; }
        }
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 0 12px ${themeColor}55; }
          50%      { box-shadow: 0 0 28px ${themeColor}99, 0 0 60px ${themeColor}44; }
        }
        @keyframes cursorBlink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        .title-enter { animation: fadeInDown 0.6s ease-out forwards; }
        .slide-up    { animation: slideInUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .fade-in     { animation: fadeIn 0.4s ease-out forwards; }
        .choice-card {
          position: relative;
          background: rgba(30,20,60,0.7);
          border: 1px solid transparent;
          border-radius: 16px;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .choice-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, ${themeColor}, #ec4899, ${themeColor});
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .choice-card:hover::before { opacity: 1; }
        .choice-card:hover {
          animation: cardGlow 1.5s ease-in-out infinite;
          background: rgba(80,20,120,0.5);
          transform: translateY(-2px);
        }
        .choice-card:active { transform: scale(0.98); }
        .cursor-blink { animation: cursorBlink 0.8s ease-in-out infinite; }
        .progress-bar-fill {
          animation: progressFill 1s ease-out 0.3s both;
        }
      `}</style>

      <div
        className="min-h-screen relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, #0f0520 0%, #1a0a35 30%, #0c1a3b 70%, #0a0a1a 100%)`,
        }}
      >
        {/* Ambient glow background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top-left, ${themeColor}22 0%, transparent 50%), radial-gradient(ellipse at bottom-right, #ec4899 22 0%, transparent 50%)`,
          }}
        />

        {/* ===== Header ===== */}
        <header className="relative z-10 px-4 pt-4 pb-2">
          <div className="max-w-2xl mx-auto">
            {/* Back + Title row */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => router.push(`/story/${characterId}`)}
                className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                ← 戻る
              </button>
              <span className="text-gray-500 text-xs">
                {storyData?.characterName} のストーリー
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">第{currentChapterNumber}章 / 全{totalChapters}章</span>
                <span className="text-xs font-bold" style={{ color: themeColor }}>
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full progress-bar-fill"
                  style={{
                    background: `linear-gradient(to right, ${themeColor}, #ec4899)`,
                    width: `${progressPct}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* ===== Main Content ===== */}
        <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Chapter Title (fade-in) */}
          <div
            className={titleVisible ? 'title-enter' : 'opacity-0'}
          >
            <div className="text-xs font-bold tracking-widest mb-1" style={{ color: `${themeColor}cc` }}>
              CHAPTER {currentChapterNumber}
            </div>
            <h1 className="text-2xl font-black text-white drop-shadow-lg leading-tight">
              {chapter.title}
            </h1>
            {chapter.isFcOnly && (
              <span className="inline-block mt-2 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                FC限定
              </span>
            )}
          </div>

          {/* Story text with typewriter */}
          <div
            className="rounded-2xl p-5 relative"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Decorative corner accents */}
            <div
              className="absolute top-0 left-0 w-8 h-8 rounded-tl-2xl pointer-events-none"
              style={{ borderTop: `2px solid ${themeColor}66`, borderLeft: `2px solid ${themeColor}66` }}
            />
            <div
              className="absolute bottom-0 right-0 w-8 h-8 rounded-br-2xl pointer-events-none"
              style={{ borderBottom: `2px solid ${themeColor}44`, borderRight: `2px solid ${themeColor}44` }}
            />

            <p className="text-gray-200 text-base leading-relaxed min-h-[4em]">
              {displayed}
              {!done && (
                <span className="cursor-blink inline-block w-0.5 h-4 ml-0.5 align-middle bg-gray-400" />
              )}
            </p>

            {/* Skip button while typing */}
            {!done && (
              <button
                onClick={skipToEnd}
                className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors underline"
              >
                スキップ →
              </button>
            )}
          </div>

          {/* Choices or Completed state */}
          {done && !choiceResult && (
            <>
              {chapter.isCompleted ? (
                <div className="fade-in text-center py-4">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-green-400 font-semibold">この章は完了済みです</p>
                  <p className="text-gray-500 text-sm mt-1">
                    あなたの選択は{storyData?.characterName}に刻まれた
                  </p>
                </div>
              ) : chapter.choices && chapter.choices.length > 0 ? (
                <div className="fade-in space-y-3">
                  <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">
                    あなたはどうする？
                  </p>
                  {chapter.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => void handleChoiceSubmit(idx)}
                      disabled={submitting}
                      className="choice-card w-full text-left p-4 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">{choice.text}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {/* Choice result */}
          {choiceResult && (
            <div
              className="fade-in rounded-2xl p-5 border"
              style={{
                background: `${themeColor}15`,
                borderColor: `${themeColor}44`,
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: themeColor }}>
                ✦ あなたの選択
              </p>
              <p className="text-gray-200 text-sm leading-relaxed">{choiceResult.consequence}</p>
              {choiceResult.nextTease && (
                <p className="text-gray-500 text-xs mt-3 italic">「{choiceResult.nextTease}」</p>
              )}
            </div>
          )}

          {/* Next chapter / back button */}
          {nextButtonVisible && (done || choiceResult) && (
            <div
              className="slide-up pt-2"
            >
              {hasNextChapter && !nextChapter?.isLocked ? (
                <button
                  onClick={goToNextChapter}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor}, #ec4899)`,
                    boxShadow: `0 4px 24px ${themeColor}55`,
                  }}
                >
                  次のチャプターへ →
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/story/${characterId}`)}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:bg-gray-700 active:scale-[0.98] bg-gray-800"
                >
                  ← ストーリー一覧へ戻る
                </button>
              )}
            </div>
          )}
        </main>

        {/* Toast */}
        {toast.visible && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-600 text-white rounded-xl px-5 py-3 shadow-2xl max-w-sm text-center text-sm">
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}
