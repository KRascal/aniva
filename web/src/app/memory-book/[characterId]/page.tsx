'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

/* ──────────────── 型定義 ──────────────── */
interface MilestoneItem {
  type: string;
  date: string;
  label: string;
}

interface HighlightItem {
  date: string;
  summary: string;
  emotion: string;
}

interface EpisodeItem {
  date: string;
  summary: string;
  importance: number;
}

interface MemoryBookData {
  characterName: string;
  characterAvatar: string | null;
  firstMeetDate: string | null;
  daysTogether: number;
  totalMessages: number;
  level: number;
  milestones: MilestoneItem[];
  highlights: HighlightItem[];
  topEpisodes: EpisodeItem[];
}

/* ──────────────── 感情カラー ──────────────── */
const EMOTION_COLORS: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  happy: {
    bg: 'bg-amber-900/30',
    border: 'border-amber-600/40',
    text: 'text-amber-300',
    emoji: '😊',
  },
  excited: {
    bg: 'bg-orange-900/30',
    border: 'border-orange-600/40',
    text: 'text-orange-300',
    emoji: '✨',
  },
  sad: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-600/40',
    text: 'text-blue-300',
    emoji: '🌧️',
  },
  mysterious: {
    bg: 'bg-purple-900/30',
    border: 'border-purple-600/40',
    text: 'text-purple-300',
    emoji: '🔮',
  },
  nostalgic: {
    bg: 'bg-rose-900/30',
    border: 'border-rose-600/40',
    text: 'text-rose-300',
    emoji: '🌙',
  },
  nervous: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-600/40',
    text: 'text-yellow-300',
    emoji: '💫',
  },
  neutral: {
    bg: 'bg-gray-800/50',
    border: 'border-gray-600/30',
    text: 'text-gray-400',
    emoji: '💭',
  },
};

function getEmotionStyle(emotion: string) {
  return EMOTION_COLORS[emotion] ?? EMOTION_COLORS['neutral'];
}

/* ──────────────── マイルストーンアイコン ──────────────── */
const MILESTONE_ICONS: Record<string, string> = {
  first_meet: '🌸',
  '7days': '🌟',
  '30days': '🎁',
  '50days': '💌',
  '100days': '🏅',
  '200days': '💎',
  '365days': '🎊',
};

/* ──────────────── メインページ ──────────────── */
export default function MemoryBookPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  const [data, setData] = useState<MemoryBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/memory-book/${characterId}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [characterId]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1208]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
          <p className="text-amber-400/70 text-sm animate-pulse">思い出を辿っています…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1208]">
        <p className="text-amber-400/50 text-sm">データが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1208] max-w-lg mx-auto pb-24">
      {/* ノイズ/テクスチャーオーバーレイ */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-10"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10">
        {/* ── ナビゲーション ── */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-900/40 backdrop-blur-sm text-amber-200/80 hover:text-amber-200 transition-colors border border-amber-700/30"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* ── ヘッダー ── */}
        <div className="pt-14 px-5 pb-8 text-center relative overflow-hidden">
          {/* 背景グロー */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-transparent pointer-events-none" />

          {/* タイトル */}
          <p className="text-amber-600/60 text-xs tracking-[0.3em] uppercase mb-4 font-medium">
            Memory Book
          </p>

          {/* アバター */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-amber-700/40 shadow-[0_0_40px_rgba(180,120,40,0.3)] mx-auto">
              {data.characterAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.characterAvatar}
                  alt={data.characterName}
                  className="w-full h-full object-cover sepia-[0.3] brightness-90"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
                  <span className="text-3xl font-black text-amber-100">
                    {data.characterName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {/* デコレーション */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-700/50 rounded-full flex items-center justify-center text-base border border-amber-600/30">
              📖
            </div>
          </div>

          <h1 className="text-amber-100 font-bold text-2xl mb-1">{data.characterName}</h1>
          <p className="text-amber-500/80 text-sm">
            {data.daysTogether > 0
              ? `${data.daysTogether}日間の思い出`
              : '出会いのはじまり'}
          </p>

          {/* 仕切り線 */}
          <div className="flex items-center gap-3 mt-6 px-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-700/40" />
            <span className="text-amber-700/60 text-xs">✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-700/40" />
          </div>
        </div>

        {/* ── 統計セクション ── */}
        <div className="px-4 mb-8">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={data.daysTogether}
              label="出会って"
              unit="日"
              icon="📅"
            />
            <StatCard
              value={data.totalMessages}
              label="メッセージ"
              unit="通"
              icon="💬"
            />
            <StatCard
              value={data.level}
              label="絆レベル"
              unit=""
              icon="⭐"
            />
          </div>
        </div>

        {/* ── マイルストーンタイムライン ── */}
        {data.milestones.length > 0 && (
          <section className="px-4 mb-8">
            <SectionTitle title="二人の歴史" icon="🏮" />
            <div className="relative mt-4">
              {/* 縦線 */}
              <div className="absolute left-5 top-3 bottom-3 w-px bg-gradient-to-b from-amber-700/60 via-amber-800/30 to-transparent" />
              <div className="space-y-4">
                {data.milestones.map((m, i) => (
                  <MilestoneRow key={m.type} milestone={m} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ハイライト会話カード ── */}
        {data.highlights.length > 0 && (
          <section className="px-4 mb-8">
            <SectionTitle title="心に残った瞬間" icon="✨" />
            <div className="space-y-3 mt-4">
              {data.highlights.map((h, i) => (
                <HighlightCard key={i} highlight={h} />
              ))}
            </div>
          </section>
        )}

        {/* ── トップエピソード ── */}
        {data.topEpisodes.length > 0 && (
          <section className="px-4 mb-8">
            <SectionTitle title="大切な思い出" icon="📜" />
            <div className="space-y-3 mt-4">
              {data.topEpisodes.map((ep, i) => (
                <EpisodeCard key={i} episode={ep} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* メッセージが少ない場合のプレースホルダー */}
        {data.highlights.length === 0 && data.topEpisodes.length === 0 && (
          <div className="px-4 mb-8 text-center py-10">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-amber-700/60 text-sm leading-relaxed">
              まだ思い出が少ないです。<br />
              もっと話しかけると、<br />
              ここに大切な記憶が刻まれていきます。
            </p>
          </div>
        )}

        {/* ── フッター ── */}
        <footer className="px-4 py-8 text-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-800/30" />
            <span className="text-amber-800/50 text-xs">✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-800/30" />
          </div>
          <p className="text-amber-700/50 text-xs italic leading-relaxed">
            この思い出は二人だけのもの
          </p>
          <p className="text-amber-800/30 text-[10px] mt-1">
            {data.firstMeetDate
              ? `${data.firstMeetDate} に始まった物語`
              : '物語はこれから始まる'}
          </p>
        </footer>
      </div>

      <style>{`
        .sepia-03 { filter: sepia(0.3); }
      `}</style>
    </div>
  );
}

/* ──────────────── サブコンポーネント ──────────────── */

function StatCard({ value, label, unit, icon }: {
  value: number;
  label: string;
  unit: string;
  icon: string;
}) {
  return (
    <div className="bg-amber-950/50 border border-amber-800/30 rounded-2xl p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-amber-100 font-black text-lg leading-none">
        {value.toLocaleString()}
        <span className="text-amber-500/60 text-xs font-normal ml-0.5">{unit}</span>
      </div>
      <div className="text-amber-600/60 text-xs mt-1">{label}</div>
    </div>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <h2 className="text-amber-300/80 text-sm font-semibold tracking-wide">{title}</h2>
      <div className="flex-1 h-px bg-amber-800/20" />
    </div>
  );
}

function MilestoneRow({
  milestone,
  index,
}: {
  milestone: MilestoneItem;
  index: number;
}) {
  const icon = MILESTONE_ICONS[milestone.type] ?? '🎯';
  return (
    <div className="relative flex items-center gap-4 pl-2">
      {/* ドット */}
      <div
        className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-[0_0_12px_rgba(180,120,40,0.4)]"
        style={{
          background: `linear-gradient(135deg, rgba(180,120,40,${0.8 - index * 0.06}), rgba(120,60,10,${0.8 - index * 0.06}))`,
          border: '1.5px solid rgba(180,120,40,0.5)',
        }}
      >
        {icon}
      </div>
      {/* コンテンツ */}
      <div className="flex-1 bg-amber-950/40 border border-amber-800/20 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-amber-200/90 text-sm font-semibold">{milestone.label}</span>
          <span className="text-amber-700/50 text-xs">{milestone.date}</span>
        </div>
      </div>
    </div>
  );
}

function HighlightCard({ highlight }: { highlight: HighlightItem }) {
  const style = getEmotionStyle(highlight.emotion);
  return (
    <div className={`${style.bg} ${style.border} border rounded-2xl p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{style.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-amber-100/80 text-sm leading-relaxed">{highlight.summary}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full bg-black/20 ${style.text} font-medium`}>
              {highlight.emotion}
            </span>
            <span className="text-amber-700/40 text-xs">{highlight.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EpisodeCard({ episode, index }: { episode: EpisodeItem; index: number }) {
  const importanceStars = '★'.repeat(Math.min(episode.importance, 5));
  const emptyStars = '☆'.repeat(Math.max(0, 5 - episode.importance));
  return (
    <div
      className="bg-amber-950/30 border border-amber-800/20 rounded-2xl p-4 relative overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* 番号バッジ */}
      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-900/50 border border-amber-700/30 flex items-center justify-center">
        <span className="text-amber-600/70 text-[10px] font-bold">{index + 1}</span>
      </div>
      <p className="text-amber-100/80 text-sm leading-relaxed pr-8">{episode.summary}</p>
      <div className="flex items-center justify-between mt-3">
        <div>
          <span className="text-amber-500 text-xs tracking-wider">{importanceStars}</span>
          <span className="text-amber-800/50 text-xs tracking-wider">{emptyStars}</span>
        </div>
        <span className="text-amber-700/40 text-xs">{episode.date}</span>
      </div>
    </div>
  );
}
