'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { track, EVENTS } from '@/lib/analytics';
import { motion, AnimatePresence } from 'framer-motion';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Types
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface CharacterStory {
  slug: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;    // 名シーン画像 = ストーリー背景
  activity: string;    // 今やっていること（名シーンに紐づく）
  chatPrompt: string;  // 会話スターター
  franchise: string;
  timeAgo: string;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   20 Stories — 各キャラの名シーンに紐づくストーリーデータ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// ストーリーデータは完全にDB駆動。キャラクターのdescription/catchphrasesから自動生成。

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Full-screen Story Viewer (Instagram Stories風)
   ページ表示 = 即フルスクリーン
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function StoriesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stories, setStories] = useState<CharacterStory[]>([]);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isPaused = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Fetch characters from DB and generate stories dynamically
  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((data) => {
        const chars = data.characters ?? [];
        const generated: CharacterStory[] = chars.map((c: Record<string, unknown>) => {
          const catchphrases = (c.catchphrases as string[]) ?? [];
          const description = (c.description as string) ?? '';
          const activity = catchphrases[0] || description.slice(0, 50) || 'こんにちは！';
          const chatPrompt = catchphrases[1] || '話しかけてみて！';
          const minutes = Math.floor(Math.random() * 30) + 1;
          return {
            slug: c.slug as string,
            name: c.name as string,
            franchise: c.franchise as string,
            activity,
            chatPrompt,
            timeAgo: `${minutes}分前`,
            avatarUrl: (c.avatarUrl as string) ?? '',
            coverUrl: (c.coverUrl as string) ?? '',
          };
        });
        setStories(generated);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const story = stories[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      router.back();
    }
  }, [currentIndex, stories.length, router]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // ストーリー表示時にイベントを計測
  useEffect(() => {
    if (loading || stories.length === 0) return;
    const s = stories[currentIndex];
    if (s) track(EVENTS.STORY_VIEWED, { characterId: s.slug });
  }, [currentIndex, loading, stories]);

  // Auto-progress timer (6秒で次へ)
  useEffect(() => {
    if (loading || stories.length === 0) return;
    setProgress(0);
    const interval = setInterval(() => {
      if (isPaused.current) return;
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 1.67; // ~60 steps * 100ms = 6 seconds
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentIndex, loading, stories.length, goNext]);

  const handleChat = (slug: string) => {
    const s = stories.find((st) => st.slug === slug);
    const topic = s ? s.activity : '';
    track(EVENTS.STORY_CHAT_STARTED, { characterId: slug });
    // fromStory=1 でチュートリアルスキップフラグ
    router.push(`/chat/${slug}?topic=${encodeURIComponent(topic.slice(0, 100))}&fromStory=1`);
  };

  // Tap zones
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pct = x / rect.width;
    // Don't handle taps on the CTA button area (bottom 25%)
    if (y / rect.height > 0.65) return;
    if (pct < 0.3) goPrev();
    else if (pct > 0.7) goNext();
  };

  if (loading || status === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-ping" />
      </div>
    );
  }

  if (!story) {
    router.back();
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black select-none"
      onClick={handleTap}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isPaused.current = true;
      }}
      onTouchEnd={(e) => {
        isPaused.current = false;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        // 下スワイプ = 閉じる
        if (dy > 100 && Math.abs(dx) < 50) {
          router.back();
          return;
        }
        if (Math.abs(dx) > 60) {
          if (dx > 0) goPrev();
          else goNext();
        }
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4" style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 16px), 24px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 bg-gray-800">
            {story.avatarUrl && <img src={story.avatarUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="text-white text-sm font-bold drop-shadow-lg">{story.name}</p>
            <p className="text-white/60 text-xs drop-shadow">{story.timeAgo} • {story.franchise}</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); router.back(); }}
          className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white bg-black/30 rounded-full backdrop-blur-sm"
        >
          ✕
        </button>
      </div>

      {/* Story Content — 名シーン画像がフルスクリーン背景 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={story.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {/* Background image (名シーン) */}
          {story.coverUrl ? (
            <img
              src={story.coverUrl}
              alt={story.name}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-gray-900" />
          )}

          {/* Gradient overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />

          {/* Story text — bottom area */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 80px), 100px)' }}>
            {/* Activity text (名シーンの台詞/出来事) */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white text-xl font-bold leading-relaxed mb-6 drop-shadow-lg"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
            >
              {story.activity}
            </motion.p>

            {/* Chat CTA — ワンタップで会話開始 */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleChat(story.slug);
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl px-6 py-4 flex items-center justify-center gap-3 shadow-xl shadow-purple-500/30 active:shadow-purple-500/50 transition-all"
            >
              <span className="text-2xl">💬</span>
              <div className="text-left">
                <p className="text-white font-bold text-base">{story.chatPrompt}</p>
                <p className="text-white/70 text-xs">タップして会話を始める</p>
              </div>
              <svg className="w-5 h-5 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Swipe hint (first story only) */}
      {currentIndex === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <p className="text-white/20 text-[10px]">← スワイプで切り替え • 下スワイプで閉じる →</p>
        </motion.div>
      )}
    </div>
  );
}
