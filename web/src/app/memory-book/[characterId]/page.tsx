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

export default function MemoryBookPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const characterId = params?.characterId as string;
  const [data, setData] = useState<MemoryBookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (!characterId || status !== 'authenticated') return;

    fetch(`/api/memory-book/${characterId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId, status, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="aniva-shimmer w-12 h-12 rounded-full bg-gray-700" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center text-gray-400">
        <p>思い出がまだありません…</p>
      </div>
    );
  }

  const levelLabels = ['', '知り合い', '顔見知り', '友達', '親友', '特別な存在'];
  const emotionEmojis: Record<string, string> = {
    嬉しい: '😊', 楽しい: '🎉', 悲しい: '😢', neutral: '😐',
    excited: '🔥', happy: '😊', sad: '😢', angry: '😤',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pb-24">
      {/* ヘッダー */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent" />
        <div className="relative px-4 pt-12 pb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4 aniva-btn-tap"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-white mb-1">
            📖 {data.characterName}との思い出
          </h1>
          <p className="text-gray-400 text-sm">
            {data.stats.daysTogether}日間の物語
          </p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatCard emoji="💬" label="会話数" value={`${data.stats.totalMessages}回`} />
          <StatCard emoji="🔥" label="連続" value={`${data.stats.streakDays}日`} />
          <StatCard emoji="💎" label="絆レベル" value={`Lv.${data.stats.level} ${levelLabels[data.stats.level] ?? ''}`} />
          <StatCard emoji="⭐" label="絆XP" value={`${data.stats.xp}`} />
        </div>
      </div>

      {/* マイルストーン */}
      {data.milestones.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">🏆 二人のマイルストーン</h2>
          <div className="space-y-2">
            {data.milestones.map((m, i) => (
              <div
                key={m.type}
                className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 aniva-scroll-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                  ✓
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{m.label}</p>
                  {m.date && (
                    <p className="text-gray-500 text-xs">
                      {new Date(m.date).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 思い出ハイライト */}
      {data.highlights.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">✨ 名場面ハイライト</h2>
          <div className="space-y-3">
            {data.highlights.map((h, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-4 border border-purple-500/10 aniva-scroll-fade-in"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">
                    {emotionEmojis[h.emotion] ?? '💭'}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{h.summary}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(h.date).toLocaleDateString('ja-JP')}
                      {h.importance >= 4 && ' ⭐ 特別な瞬間'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* キャラが知っていること */}
      {data.facts.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">🧠 {data.characterName}が覚えていること</h2>
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
            {data.facts.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={f.confidence >= 0.9 ? 'text-green-400' : 'text-yellow-400'}>
                  {f.confidence >= 0.9 ? '●' : '○'}
                </span>
                <span className="text-gray-300">{f.fact}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 感情サマリー */}
      {data.emotionalSummary && (
        <section className="px-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">💝 二人の関係</h2>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-300 text-sm leading-relaxed">{data.emotionalSummary}</p>
            {data.emotionalTrend && (
              <p className="text-gray-500 text-xs mt-2">
                最近の雰囲気: {emotionEmojis[data.emotionalTrend.dominant] ?? '💭'} {data.emotionalTrend.dominant}
                （{Math.round(data.emotionalTrend.frequency * 100)}%）
              </p>
            )}
          </div>
        </section>
      )}

      {/* フッターメッセージ */}
      <div className="px-4 text-center">
        <p className="text-gray-600 text-xs">
          この思い出は、あなたと{data.characterName}だけのもの
        </p>
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-3 text-center aniva-scroll-fade-in">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-white font-bold text-lg">{value}</div>
      <div className="text-gray-400 text-xs">{label}</div>
    </div>
  );
}
