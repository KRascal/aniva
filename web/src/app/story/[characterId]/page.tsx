'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBGM } from '@/hooks/useBGM';

// ユーザー名をストーリーテキストに挿入（{{userName}} → 実際の名前）
function insertUserName(text: string, userName: string): string {
  return text.replace(/\{\{userName\}\}/g, userName);
}

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
  unlockCardId?: string | null;
  unlockCard?: { id: string; name: string; rarity: string; imageUrl: string | null; cardImageUrl: string | null } | null;
  isLocked: boolean;
  lockReason: string | null;
  isCompleted: boolean;
  choicesMade: { choiceIndex: number; consequence: string; selectedAt: string }[];
  startedAt: string | null;
  completedAt: string | null;
  backgroundUrl?: string | null;
  characterImageUrl?: string | null;
  bgmType?: string | null;
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

interface RewardState {
  xpEarned: number;
  coinsEarned: number;
}

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userName = (session?.user as { displayName?: string; name?: string } | undefined)?.displayName
    || session?.user?.name || 'あなた';
  const characterId = params.characterId as string;

  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<ChapterData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastMsg>({ message: '', visible: false });
  const [reward, setReward] = useState<RewardState | null>(null);

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
      const data = await res.json() as {
        consequence?: string;
        nextTease?: string;
        rewards?: { xpEarned: number; coinsEarned: number } | null;
      };
      if (res.ok) {
        // 報酬があれば演出を表示
        if (data.rewards && (data.rewards.xpEarned > 0 || data.rewards.coinsEarned > 0)) {
          setReward(data.rewards);
          setTimeout(() => setReward(null), 2000);
        }
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
        <div className="text-gray-400 text-lg">この子の物語はまだ始まっていない…</div>
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
      <header className="relative z-10 border-b border-gray-800 bg-gray-950 px-4 py-4">
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

      {/* チャプター詳細モーダル（VNスタイル） */}
      {selectedChapter && (
        <ChapterModal
          chapter={selectedChapter}
          characterName={storyData.characterName}
          userName={userName}
          submitting={submitting}
          onClose={() => setSelectedChapter(null)}
          onChoiceSubmit={(choiceIndex) => handleChoiceSubmit(selectedChapter, choiceIndex)}
        />
      )}

      {/* 報酬演出 */}
      {reward && <RewardAnimation xpEarned={reward.xpEarned} coinsEarned={reward.coinsEarned} />}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-600 text-white rounded-xl px-5 py-3 shadow-2xl max-w-sm text-center text-sm animate-fade-in">
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── RewardAnimation ───────────────────────────────────────────
function RewardAnimation({
  xpEarned,
  coinsEarned,
}: {
  xpEarned: number;
  coinsEarned: number;
}) {
  return (
    <>
      {/* 光のフラッシュ */}
      <div
        className="fixed inset-0 z-[60] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,200,0.18) 0%, transparent 70%)',
          animation: 'reward-flash 1.5s ease-out forwards',
        }}
      />
      {/* 報酬バッジ */}
      <div className="fixed inset-0 z-[61] pointer-events-none flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {coinsEarned > 0 && (
            <div
              className="text-2xl font-bold text-yellow-400 drop-shadow-lg"
              style={{ animation: 'reward-float 1.5s ease-out forwards' }}
            >
              +{coinsEarned}🪙
            </div>
          )}
          {xpEarned > 0 && (
            <div
              className="text-2xl font-bold text-purple-400 drop-shadow-lg"
              style={{
                animation: 'reward-float 1.5s ease-out 0.15s forwards',
                opacity: 0,
              }}
            >
              +{xpEarned} XP ✨
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes reward-float {
          0%   { opacity: 0; transform: translateY(0px); }
          20%  { opacity: 1; }
          80%  { opacity: 1; transform: translateY(-60px); }
          100% { opacity: 0; transform: translateY(-80px); }
        }
        @keyframes reward-flash {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
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
            {chapter.unlockCardId && (
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                カード解放
              </span>
            )}
            {chapter.isFcOnly && !chapter.unlockCardId && (
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

// ─── useTypewriter ─────────────────────────────────────────────
function useTypewriter(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    if (!text) {
      setDone(true);
      return;
    }

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

// ─── ChapterModal (VN全画面スタイル) ──────────────────────────
function ChapterModal({
  chapter,
  characterName,
  userName,
  submitting,
  onClose,
  onChoiceSubmit,
}: {
  chapter: ChapterData;
  characterName: string;
  userName: string;
  submitting: boolean;
  onClose: () => void;
  onChoiceSubmit: (choiceIndex: number) => void;
}) {
  const fullText = insertUserName(chapter.synopsis ?? '', userName);
  const { displayed, done } = useTypewriter(fullText, 28);

  // タップでテキストを即座に全表示させるフラグ
  const [skipTypewriter, setSkipTypewriter] = useState(false);
  const shownText = skipTypewriter ? fullText : displayed;

  // BGMフック（bgmTypeがある場合に再生）
  useBGM(chapter.bgmType ?? null);

  const handleTextAreaClick = () => {
    if (!done && !skipTypewriter) {
      setSkipTypewriter(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ touchAction: 'none' }}
    >
      {/* ── 上半分: 背景 + キャラ立ち絵 ────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {/* 背景画像 or 暗いグラデ */}
        {chapter.backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chapter.backgroundUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, #0f0f1a 0%, #1a0a1a 40%, #0a0a14 100%)',
            }}
          />
        )}
        {/* 下向きグラデーションオーバーレイ（テキストエリアとの接続） */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))',
          }}
        />

        {/* 閉じるボタン（右上） */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white/60 hover:text-white bg-black/30 rounded-full w-8 h-8 flex items-center justify-center text-lg transition-colors"
          aria-label="閉じる"
        >
          ×
        </button>

        {/* キャラ立ち絵 */}
        {chapter.characterImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chapter.characterImageUrl}
            alt={characterName}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full max-h-[90%] object-contain object-bottom pointer-events-none select-none"
            draggable={false}
          />
        )}
      </div>

      {/* ── 下半分: テキストエリア ──────────────────── */}
      <div
        className="flex-none bg-black/80 backdrop-blur-sm border-t border-white/10 px-5 pt-4 pb-6 space-y-4"
        style={{ minHeight: '42%', maxHeight: '55%', overflowY: 'auto' }}
      >
        {/* タイトル */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🌙</span>
          <h2 className="text-white font-bold text-base leading-tight">
            第{chapter.chapterNumber}章「{chapter.title}」
          </h2>
          {chapter.isFcOnly && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
              FC限定
            </span>
          )}
        </div>

        {/* あらすじ（タイプライター） */}
        <div
          className="cursor-pointer select-none"
          onClick={handleTextAreaClick}
          title={done ? undefined : 'タップでスキップ'}
        >
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {shownText}
            {!done && !skipTypewriter && (
              <span className="inline-block w-0.5 h-4 bg-white/80 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </p>
        </div>

        {/* 選択肢 or 完了済み（テキスト表示完了後に表示） */}
        {(done || skipTypewriter) && (
          <>
            {chapter.isCompleted ? (
              <div className="text-center py-2">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-green-400 text-sm font-medium">この章は完了済みです</p>
                <p className="text-gray-500 text-xs mt-1">
                  あなたの選択は{characterName}に刻まれた
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                  あなたはどうする？
                </p>
                {(chapter.choices ?? []).map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => onChoiceSubmit(idx)}
                    disabled={submitting}
                    className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-red-900/40 border border-white/20 hover:border-red-500/60 text-white text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
