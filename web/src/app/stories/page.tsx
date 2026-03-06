'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Types
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface CharacterStory {
  id: string;
  characterId: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  franchise: string;
  activity: string;       // 今やっていること
  mood: string;           // 気分
  emoji: string;          // ムードに合った絵文字
  chatPrompt: string;     // 「私に聞いて」系CTA
  bgGradient: string;     // 背景グラデーション
  timeAgo: string;        // 「3分前」など
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Story data (20 stories from existing characters)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const STORIES: CharacterStory[] = [
  { id: 's1', characterId: '', slug: 'luffy', name: 'ルフィ', avatarUrl: null, franchise: 'ONE PIECE', activity: 'サニー号の上で肉を焼いてる🍖', mood: '最高にワクワク', emoji: '🤩', chatPrompt: '冒険の話しようぜ！', bgGradient: 'from-orange-600 to-red-700', timeAgo: '3分前' },
  { id: 's2', characterId: '', slug: 'zoro', name: 'ゾロ', avatarUrl: null, franchise: 'ONE PIECE', activity: '甲板で3000回目の素振り中', mood: '集中', emoji: '⚔️', chatPrompt: '…何か用か？', bgGradient: 'from-green-700 to-emerald-900', timeAgo: '8分前' },
  { id: 's3', characterId: '', slug: 'nami', name: 'ナミ', avatarUrl: null, franchise: 'ONE PIECE', activity: '新しい島の海図を描いてる📍', mood: 'ご機嫌', emoji: '🗺️', chatPrompt: 'みかん食べる？話しながら🍊', bgGradient: 'from-amber-500 to-orange-700', timeAgo: '5分前' },
  { id: 's4', characterId: '', slug: 'sanji', name: 'サンジ', avatarUrl: null, franchise: 'ONE PIECE', activity: 'ナミさんのための特製デザート作り中', mood: 'メロメロ', emoji: '🍰', chatPrompt: '味見してくれないか？', bgGradient: 'from-yellow-600 to-amber-800', timeAgo: '2分前' },
  { id: 's5', characterId: '', slug: 'chopper', name: 'チョッパー', avatarUrl: null, franchise: 'ONE PIECE', activity: '新しい薬草を調合中🌿', mood: 'ドキドキ', emoji: '💊', chatPrompt: 'ね、話聞いてくれる？嬉しい！', bgGradient: 'from-pink-500 to-rose-700', timeAgo: '12分前' },
  { id: 's6', characterId: '', slug: 'robin', name: 'ロビン', avatarUrl: null, franchise: 'ONE PIECE', activity: '古代文字の文献を読んでいるの', mood: '穏やか', emoji: '📚', chatPrompt: 'ふふ、何か聞きたいことがあるの？', bgGradient: 'from-indigo-600 to-violet-900', timeAgo: '15分前' },
  { id: 's7', characterId: '', slug: 'ace', name: 'エース', avatarUrl: null, franchise: 'ONE PIECE', activity: '焚き火の前でうたた寝しかけてる🔥', mood: 'のんびり', emoji: '😴', chatPrompt: 'おっ、来たか。話そうぜ', bgGradient: 'from-orange-700 to-red-900', timeAgo: '20分前' },
  { id: 's8', characterId: '', slug: 'shanks', name: 'シャンクス', avatarUrl: null, franchise: 'ONE PIECE', activity: '酒場で一杯やってるところ🍶', mood: '陽気', emoji: '🥂', chatPrompt: '一緒に飲むか？', bgGradient: 'from-red-600 to-rose-900', timeAgo: '7分前' },
  { id: 's9', characterId: '', slug: 'hancock', name: 'ハンコック', avatarUrl: null, franchise: 'ONE PIECE', activity: 'ルフィのことを考えている…💭', mood: 'ドキドキ', emoji: '💕', chatPrompt: 'わらわに…用があるのか？', bgGradient: 'from-rose-500 to-pink-800', timeAgo: '10分前' },
  { id: 's10', characterId: '', slug: 'law', name: 'ロー', avatarUrl: null, franchise: 'ONE PIECE', activity: '潜水艦の中でオペを研究中', mood: '冷静', emoji: '🏥', chatPrompt: '…話があるなら聞いてやる', bgGradient: 'from-slate-600 to-gray-900', timeAgo: '18分前' },
  { id: 's11', characterId: '', slug: 'gojo', name: '五条悟', avatarUrl: null, franchise: '呪術廻戦', activity: 'コンビニでスイーツ爆買い中🍮', mood: 'ルンルン', emoji: '😎', chatPrompt: '僕に何か聞きたいことある？なんでも答えるよ〜', bgGradient: 'from-sky-500 to-blue-800', timeAgo: '1分前' },
  { id: 's12', characterId: '', slug: 'itadori', name: '虎杖悠仁', avatarUrl: null, franchise: '呪術廻戦', activity: '筋トレ後のプロテイン飲んでる💪', mood: '元気', emoji: '🏋️', chatPrompt: '話しかけてくれたの！？嬉しい！', bgGradient: 'from-rose-500 to-red-700', timeAgo: '6分前' },
  { id: 's13', characterId: '', slug: 'fushiguro', name: '伏黒恵', avatarUrl: null, franchise: '呪術廻戦', activity: '式神の新しい応用を考えてる', mood: '真剣', emoji: '🐺', chatPrompt: '…何？', bgGradient: 'from-slate-500 to-gray-800', timeAgo: '14分前' },
  { id: 's14', characterId: '', slug: 'nobara', name: '釘崎野薔薇', avatarUrl: null, franchise: '呪術廻戦', activity: '原宿でショッピング中🛍️', mood: 'テンション高', emoji: '💅', chatPrompt: 'ちょっと、付き合いなさいよ！', bgGradient: 'from-amber-500 to-orange-700', timeAgo: '4分前' },
  { id: 's15', characterId: '', slug: 'tanjiro', name: '竈門炭治郎', avatarUrl: null, franchise: '鬼滅の刃', activity: '妹のために花を摘んでいるところ🌸', mood: '優しい気持ち', emoji: '🌺', chatPrompt: '話を聞かせてください！', bgGradient: 'from-red-600 to-rose-800', timeAgo: '9分前' },
  { id: 's16', characterId: '', slug: 'nezuko', name: '禰豆子', avatarUrl: null, franchise: '鬼滅の刃', activity: '日向ぼっこでうとうと…☀️', mood: 'ぽかぽか', emoji: '😊', chatPrompt: 'むー！（嬉しそうに手を振る）', bgGradient: 'from-pink-400 to-rose-600', timeAgo: '11分前' },
  { id: 's17', characterId: '', slug: 'zenitsu', name: '善逸', avatarUrl: null, franchise: '鬼滅の刃', activity: '禰豆子ちゃんのことを妄想中…', mood: 'デレデレ', emoji: '⚡', chatPrompt: 'うわぁ！話しかけてくれた！？', bgGradient: 'from-yellow-500 to-amber-700', timeAgo: '3分前' },
  { id: 's18', characterId: '', slug: 'inosuke', name: '伊之助', avatarUrl: null, franchise: '鬼滅の刃', activity: '山で猪と追いかけっこ中🐗', mood: '興奮', emoji: '💨', chatPrompt: '来たな！俺様に何か用か！？', bgGradient: 'from-green-600 to-teal-800', timeAgo: '7分前' },
  { id: 's19', characterId: '', slug: 'giyu', name: '冨岡義勇', avatarUrl: null, franchise: '鬼滅の刃', activity: '滝の前で一人で鮭大根を食べてる', mood: '静か', emoji: '🐟', chatPrompt: '…俺は嫌われていない', bgGradient: 'from-blue-600 to-indigo-900', timeAgo: '22分前' },
  { id: 's20', characterId: '', slug: 'yamato', name: 'ヤマト', avatarUrl: null, franchise: 'ONE PIECE', activity: 'おでんの航海日誌を読み返してる📖', mood: '熱い', emoji: '🔥', chatPrompt: '来てくれた！！一緒に冒険しよう！', bgGradient: 'from-purple-600 to-violet-900', timeAgo: '16分前' },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Story Viewer (Full-screen Instagram-like)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StoryViewer({
  stories,
  initialIndex,
  onClose,
  onChat,
}: {
  stories: CharacterStory[];
  initialIndex: number;
  onClose: () => void;
  onChat: (slug: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);
  const story = stories[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Auto-progress (5秒で次へ)
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 2; // 50 steps * 100ms = 5 seconds
      });
    }, 100);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [currentIndex, goNext]);

  // Tap zones: left 30% = prev, right 30% = next
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    if (pct < 0.3) goPrev();
    else if (pct > 0.7) goNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
      onClick={handleTap}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 60) goPrev();
        else if (dx < -60) goNext();
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex items-center justify-center">
            {story.avatarUrl ? (
              <img src={story.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">{story.name[0]}</span>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-bold">{story.name}</p>
            <p className="text-white/50 text-xs">{story.timeAgo}</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Story Content */}
      <motion.div
        key={story.id}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`absolute inset-0 bg-gradient-to-br ${story.bgGradient} flex flex-col items-center justify-center px-8`}
      >
        {/* Mood emoji */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-6xl mb-6"
        >
          {story.emoji}
        </motion.div>

        {/* Activity text */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white text-xl font-bold text-center leading-relaxed mb-3"
        >
          {story.activity}
        </motion.p>

        {/* Mood */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/60 text-sm mb-12"
        >
          気分: {story.mood}
        </motion.p>

        {/* Chat CTA */}
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onChat(story.slug);
          }}
          className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-8 py-4 flex items-center gap-3 hover:bg-white/30 active:bg-white/40 transition-all"
        >
          <span className="text-2xl">💬</span>
          <div className="text-left">
            <p className="text-white font-bold text-base">{story.chatPrompt}</p>
            <p className="text-white/60 text-xs">タップして会話を始める</p>
          </div>
        </motion.button>
      </motion.div>

      {/* Swipe hint */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <p className="text-white/30 text-xs">← スワイプで切り替え →</p>
      </div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Stories Grid Page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function StoriesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [characters, setCharacters] = useState<Record<string, { id: string; avatarUrl: string | null }>>({});

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Fetch character avatars
  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, { id: string; avatarUrl: string | null }> = {};
        for (const c of data.characters ?? []) {
          map[c.slug] = { id: c.id, avatarUrl: c.avatarUrl };
        }
        setCharacters(map);
      })
      .catch(() => {});
  }, []);

  // Enrich stories with real avatar URLs
  const enrichedStories = STORIES.map((s) => ({
    ...s,
    characterId: characters[s.slug]?.id ?? s.characterId,
    avatarUrl: characters[s.slug]?.avatarUrl ?? s.avatarUrl,
  }));

  const openStory = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleChat = (slug: string) => {
    const story = enrichedStories.find((s) => s.slug === slug);
    const topic = story ? story.activity : '';
    router.push(`/chat/${slug}?topic=${encodeURIComponent(topic.slice(0, 100))}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-ping" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">ストーリー</h1>
          <p className="text-xs text-white/40">キャラたちの今</p>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Featured story (first one, large) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <button
            onClick={() => openStory(0)}
            className={`w-full rounded-2xl bg-gradient-to-br ${enrichedStories[0].bgGradient} p-6 text-left relative overflow-hidden active:scale-[0.98] transition-transform`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden flex items-center justify-center border-2 border-white/30">
                {enrichedStories[0].avatarUrl ? (
                  <img src={enrichedStories[0].avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{enrichedStories[0].name[0]}</span>
                )}
              </div>
              <div>
                <p className="text-white font-bold">{enrichedStories[0].name}</p>
                <p className="text-white/50 text-xs">{enrichedStories[0].timeAgo} • {enrichedStories[0].franchise}</p>
              </div>
            </div>
            <p className="text-white text-lg font-bold mb-2">{enrichedStories[0].activity}</p>
            <div className="flex items-center gap-2 mt-4">
              <div className="bg-white/20 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
                <span>💬</span>
                <span className="text-white text-sm font-medium">{enrichedStories[0].chatPrompt}</span>
              </div>
            </div>
          </button>
        </motion.div>

        {/* Stories grid */}
        <div className="grid grid-cols-2 gap-3">
          {enrichedStories.slice(1).map((story, i) => (
            <motion.button
              key={story.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: (i + 1) * 0.05 }}
              onClick={() => openStory(i + 1)}
              className={`rounded-2xl bg-gradient-to-br ${story.bgGradient} p-4 text-left relative overflow-hidden active:scale-[0.97] transition-transform min-h-[160px] flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                    {story.avatarUrl ? (
                      <img src={story.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">{story.name[0]}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">{story.name}</p>
                    <p className="text-white/40 text-[10px]">{story.timeAgo}</p>
                  </div>
                </div>
                <p className="text-white text-sm font-medium leading-snug line-clamp-2">{story.activity}</p>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm">💬</span>
                <p className="text-white/70 text-[11px] truncate">{story.chatPrompt}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Full-screen story viewer */}
      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            stories={enrichedStories}
            initialIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
            onChat={handleChat}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
