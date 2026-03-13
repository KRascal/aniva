'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface MemoryBookData {
  characterName: string;
  characterSlug: string;
  stats: {
    level: number;
    totalMessages: number;
    streakDays: number;
    xp: number;
    daysTogether: number;
    firstChatDate: string | null;
  };
  highlights: Array<{ summary: string; date: string; emotion: string; importance: number }>;
  facts: Array<{ fact: string; confidence: number; updatedAt: string }>;
  milestones: Array<{ type: string; label: string; date?: string; achieved: boolean }>;
  emotionalSummary: string | null;
  emotionalTrend: { dominant: string; frequency: number } | null;
}

/* ── SVG Icon Components ── */
function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}
function IconFlame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
    </svg>
  );
}
function IconDiamond({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41L13.7 2.71a2.41 2.41 0 00-3.41 0z"/>
    </svg>
  );
}
function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-0.85-3.25-2.03-3.79A1.09 1.09 0 0114 17v-2.34"/>
      <path d="M18 2H6v7a6 6 0 1012 0V2z"/>
    </svg>
  );
}
function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.962 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.962 0z"/>
      <path d="M20 3v4"/><path d="M22 5h-4"/>
    </svg>
  );
}
function IconBrain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 10-5.997.125 4 4 0 00-2.526 5.77 4 4 0 00.556 6.588A4 4 0 1012 18z"/>
      <path d="M12 5a3 3 0 115.997.125 4 4 0 012.526 5.77 4 4 0 00-.556 6.588A4 4 0 1112 18z"/>
      <path d="M15 13a4.5 4.5 0 01-3 4 4.5 4.5 0 01-3-4"/><path d="M12 18v4"/>
    </svg>
  );
}
function IconHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>
    </svg>
  );
}
function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/>
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
    </svg>
  );
}

/* ── Emotion icon mapping ── */
const EMOTION_ICONS: Record<string, { color: string; bg: string }> = {
  '嬉しい': { color: 'text-amber-400', bg: 'bg-amber-400/10' },
  '楽しい': { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  '悲しい': { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'neutral': { color: 'text-gray-400', bg: 'bg-gray-400/10' },
  'excited': { color: 'text-orange-400', bg: 'bg-orange-400/10' },
  'happy': { color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'sad': { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'angry': { color: 'text-red-400', bg: 'bg-red-400/10' },
};

export default function MemoryBookPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const characterId = params?.characterId as string;
  const [data, setData] = useState<MemoryBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (!characterId || status !== 'authenticated') return;

    fetch(`/api/memory-book/${characterId}`)
      .then(r => {
        if (r.status === 404) {
          setData(null);
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [characterId, status, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">思い出を読み込み中…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex flex-col items-center justify-center gap-4 text-gray-400 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-800/80 flex items-center justify-center">
          <IconBook className="w-7 h-7 text-gray-500" />
        </div>
        <p className="text-white/70 font-medium">思い出ブックを読み込めませんでした</p>
        <button onClick={() => { setFetchError(false); setLoading(true); }} className="text-purple-400 text-sm underline">再試行</button>
        <button onClick={() => router.back()} className="text-gray-500 text-sm">戻る</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex flex-col items-center justify-center text-gray-400 p-8 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/80 flex items-center justify-center">
          <IconBook className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-white/70 font-bold text-lg">まだ思い出はない</p>
        <p className="text-gray-500 text-sm text-center max-w-[250px]">会話を重ねると、ここに二人だけの思い出が記録されていくよ</p>
        <button
          onClick={() => router.push(`/chat/${characterId}`)}
          className="mt-2 px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}
        >
          話しかけてみる
        </button>
        <button onClick={() => router.back()} className="text-gray-500 text-sm mt-1">戻る</button>
      </div>
    );
  }

  const levelLabels = ['', '知り合い', '顔見知り', '友達', '親友', '特別な存在'];

  /* Build unified timeline from milestones + highlights, sorted by date desc */
  const timelineItems: Array<{
    type: 'milestone' | 'highlight';
    label: string;
    date: string | null;
    emotion?: string;
    importance?: number;
  }> = [
    ...data.milestones.map(m => ({
      type: 'milestone' as const,
      label: m.label,
      date: m.date ?? null,
    })),
    ...data.highlights.map(h => ({
      type: 'highlight' as const,
      label: h.summary,
      date: h.date,
      emotion: h.emotion,
      importance: h.importance,
    })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent" />
        <div className="relative px-4 pt-12 pb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-4 aniva-btn-tap transition-colors"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span className="text-sm">戻る</span>
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <IconBook className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {data.characterName}との思い出
            </h1>
          </div>
          <p className="text-gray-400 text-sm ml-12">
            {data.stats.daysTogether}日間の物語
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<IconChat className="w-5 h-5" />} iconColor="text-blue-400" label="会話数" value={`${data.stats.totalMessages}回`} />
          <StatCard icon={<IconFlame className="w-5 h-5" />} iconColor="text-orange-400" label="連続" value={`${data.stats.streakDays}日`} />
          <StatCard icon={<IconDiamond className="w-5 h-5" />} iconColor="text-purple-400" label="絆レベル" value={`Lv.${data.stats.level} ${levelLabels[data.stats.level] ?? ''}`} />
          <StatCard icon={<IconStar className="w-5 h-5" />} iconColor="text-yellow-400" label="絆XP" value={`${data.stats.xp}`} />
        </div>
      </div>

      {/* Visual Timeline */}
      {timelineItems.length > 0 && (
        <section className="px-4 mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <IconSparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">二人のタイムライン</h2>
          </div>
          <div className="relative ml-3">
            {/* Vertical line */}
            <div
              className="absolute left-[7px] top-2 bottom-2 w-[2px]"
              style={{ background: 'linear-gradient(to bottom, rgba(139,92,246,0.4), rgba(139,92,246,0.05))' }}
            />

            <div className="space-y-0">
              {timelineItems.map((item, i) => {
                const isMilestone = item.type === 'milestone';
                const emotionStyle = item.emotion ? EMOTION_ICONS[item.emotion] : null;
                const isSpecial = (item.importance ?? 0) >= 4;

                return (
                  <div
                    key={`${item.type}-${i}`}
                    className="relative pl-8 pb-6 last:pb-0 aniva-scroll-fade-in"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center ${
                      isMilestone
                        ? 'border-yellow-500/80 bg-yellow-500/20'
                        : isSpecial
                        ? 'border-purple-400/80 bg-purple-400/20'
                        : 'border-gray-500/60 bg-gray-500/10'
                    }`}>
                      {isMilestone && (
                        <div className="w-[6px] h-[6px] rounded-full bg-yellow-400" />
                      )}
                      {!isMilestone && isSpecial && (
                        <div className="w-[6px] h-[6px] rounded-full bg-purple-400" />
                      )}
                      {!isMilestone && !isSpecial && (
                        <div className="w-[4px] h-[4px] rounded-full bg-gray-500" />
                      )}
                    </div>

                    {/* Content card */}
                    <div className={`rounded-xl p-3.5 border transition-all ${
                      isMilestone
                        ? 'bg-yellow-500/5 border-yellow-500/15'
                        : isSpecial
                        ? 'bg-purple-500/5 border-purple-500/15'
                        : 'bg-gray-800/40 border-gray-700/20'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        {isMilestone ? (
                          <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <IconTrophy className="w-3.5 h-3.5 text-yellow-400" />
                          </div>
                        ) : emotionStyle ? (
                          <div className={`w-7 h-7 rounded-lg ${emotionStyle.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <IconHeart className={`w-3.5 h-3.5 ${emotionStyle.color}`} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gray-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <IconSparkles className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {isMilestone && (
                            <span className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-wider">マイルストーン</span>
                          )}
                          {isSpecial && !isMilestone && (
                            <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">特別な瞬間</span>
                          )}
                          <p className="text-white text-sm leading-relaxed">{item.label}</p>
                          {item.date && (
                            <p className="text-gray-500 text-xs mt-1.5">
                              {new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Facts - What the character remembers */}
      {data.facts.length > 0 && (
        <section className="px-4 mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <IconBrain className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">{data.characterName}が覚えていること</h2>
          </div>
          <div className="bg-gray-800/40 rounded-xl p-4 space-y-2.5 border border-gray-700/20">
            {data.facts.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  f.confidence >= 0.9 ? 'bg-emerald-400' : 'bg-yellow-400/60'
                }`} />
                <span className="text-gray-300 leading-relaxed">{f.fact}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Emotional Summary */}
      {data.emotionalSummary && (
        <section className="px-4 mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <IconHeart className="w-5 h-5 text-pink-400" />
            <h2 className="text-lg font-bold text-white">二人の関係</h2>
          </div>
          <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/20">
            <p className="text-gray-300 text-sm leading-relaxed">{data.emotionalSummary}</p>
            {data.emotionalTrend && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/30">
                <div className={`w-2 h-2 rounded-full ${
                  (EMOTION_ICONS[data.emotionalTrend.dominant]?.color ?? 'text-gray-400').replace('text-', 'bg-')
                }`} />
                <p className="text-gray-500 text-xs">
                  最近の雰囲気: {data.emotionalTrend.dominant}
                  （{Math.round(data.emotionalTrend.frequency * 100)}%）
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="px-4 text-center">
        <p className="text-gray-600 text-xs">
          この思い出は、あなたと{data.characterName}だけのもの
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, iconColor, label, value }: { icon: React.ReactNode; iconColor: string; label: string; value: string }) {
  return (
    <div className="bg-gray-800/40 rounded-xl p-3.5 aniva-scroll-fade-in border border-gray-700/20">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg bg-gray-700/30 flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <div>
          <div className="text-white font-bold text-base leading-tight">{value}</div>
          <div className="text-gray-500 text-xs">{label}</div>
        </div>
      </div>
    </div>
  );
}
