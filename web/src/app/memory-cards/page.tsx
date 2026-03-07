'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MemoryCard {
  id: string;
  title: string;
  body: string;
  characterId: string | null;
  createdAt: string;
  character?: {
    name: string;
    avatarUrl: string | null;
  };
}

// マイルストーン装飾（memory-card.tsと同期）
const MILESTONE_STYLES: Record<string, { emoji: string; gradient: string }> = {
  '出会いの記録':       { emoji: '🌱', gradient: 'from-green-500/20 to-emerald-600/20' },
  '仲良しの証':         { emoji: '💫', gradient: 'from-blue-500/20 to-purple-600/20' },
  '100通の絆':           { emoji: '💎', gradient: 'from-purple-500/20 to-pink-600/20' },
  '特別な存在':          { emoji: '🌟', gradient: 'from-amber-500/20 to-orange-600/20' },
  '500通の物語':         { emoji: '👑', gradient: 'from-yellow-400/20 to-amber-600/20' },
  '千の言葉を超えて':    { emoji: '🏆', gradient: 'from-rose-500/20 to-red-600/20' },
  'かけがえのない二人':  { emoji: '💖', gradient: 'from-pink-400/20 to-rose-600/20' },
  '永遠の絆':            { emoji: '✨', gradient: 'from-indigo-400/20 to-violet-600/20' },
};

export default function MemoryCardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }

    const fetchCards = async () => {
      try {
        const res = await fetch('/api/memory-cards');
        if (res.ok) {
          const data = await res.json();
          setCards(data.cards ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [session, status, router]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5"
        style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            ←
          </button>
          <h1 className="text-lg font-black text-white">💎 思い出カード</h1>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💎</span>
            </div>
            <p className="text-white/60 text-sm font-medium mb-2">まだ思い出カードがありません</p>
            <p className="text-white/30 text-xs leading-relaxed">
              キャラクターと会話を重ねると<br />
              マイルストーンごとに思い出カードが生まれます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => {
              const style = MILESTONE_STYLES[card.title] ?? { emoji: '🎴', gradient: 'from-gray-500/20 to-gray-600/20' };
              return (
                <div
                  key={card.id}
                  className={`relative rounded-2xl p-5 border border-white/8 bg-gradient-to-br ${style.gradient} overflow-hidden`}
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  {/* キラキラ装飾 */}
                  <div className="absolute top-3 right-3 text-2xl opacity-30">{style.emoji}</div>

                  <div className="flex items-start gap-3">
                    {/* キャラアバター */}
                    {card.character?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.character.avatarUrl}
                        alt={card.character.name}
                        className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center text-xl flex-shrink-0">
                        {style.emoji}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{style.emoji}</span>
                        <h3 className="text-white font-bold text-sm">{card.title}</h3>
                      </div>
                      {card.character?.name && (
                        <p className="text-white/40 text-xs mb-1">with {card.character.name}</p>
                      )}
                      <p className="text-white/60 text-xs leading-relaxed">{card.body}</p>
                      <p className="text-white/20 text-[10px] mt-2">{formatDate(card.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
