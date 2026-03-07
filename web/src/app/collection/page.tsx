'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface CardInfo {
  userCardId: string;
  obtainedAt: string;
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    rarity: string;
    category: string;
    character: { id: string; name: string; avatarUrl: string | null };
  };
}

const RARITY_STYLES: Record<string, { border: string; label: string; glow: string; labelColor: string }> = {
  N:   { border: 'border-gray-500',   label: 'N',    glow: '',                              labelColor: 'text-gray-400' },
  R:   { border: 'border-blue-500',   label: 'R',    glow: 'shadow-blue-500/30',             labelColor: 'text-blue-400' },
  SR:  { border: 'border-purple-500', label: 'SR',   glow: 'shadow-purple-500/40',           labelColor: 'text-purple-400' },
  SSR: { border: 'border-yellow-400', label: 'SSR',  glow: 'shadow-yellow-400/60',           labelColor: 'text-yellow-400' },
  UR:  { border: 'border-pink-400',   label: 'UR',   glow: 'shadow-pink-400/70',             labelColor: 'text-pink-400' },
};

const RARITY_BG: Record<string, string> = {
  N:   'bg-gray-800',
  R:   'bg-gradient-to-b from-blue-950 to-gray-900',
  SR:  'bg-gradient-to-b from-purple-950 to-gray-900',
  SSR: 'bg-gradient-to-b from-yellow-950 to-gray-900',
  UR:  'bg-gradient-to-b from-pink-950 via-purple-950 to-gray-900',
};

const MODAL_BG: Record<string, string> = {
  N:   'bg-gray-900',
  R:   'bg-gradient-to-b from-blue-950 to-gray-900',
  SR:  'bg-gradient-to-b from-purple-950 to-gray-900',
  SSR: 'bg-gradient-to-b from-yellow-950 via-gray-900 to-gray-900',
  UR:  'bg-gradient-to-b from-pink-950 via-purple-950 to-gray-900',
};

type FilterRarity = 'ALL' | 'UR' | 'SSR' | 'SR' | 'R' | 'N';

// キラキラパーティクル（モーダル用）
function SparkleParticles({ count = 12 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-2xl">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="sparkle-particle absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            background: i % 2 === 0
              ? 'radial-gradient(circle, #fde68a, #f59e0b)'
              : 'radial-gradient(circle, #f9a8d4, #a855f7)',
          }}
        />
      ))}
    </div>
  );
}

export default function CollectionPage() {
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [filter, setFilter] = useState<FilterRarity>('ALL');
  const [selectedCard, setSelectedCard] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    fetch('/api/gacha/cards')
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards ?? []);
        setOwnedCount(data.ownedCount ?? 0);
        setTotalCards(data.totalCards ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  // モーダルが開くたびにお気に入り状態をリセット
  useEffect(() => {
    if (selectedCard) setFavorited(false);
  }, [selectedCard]);

  const filtered = filter === 'ALL' ? cards : cards.filter((c) => c.card.rarity === filter);
  const filters: FilterRarity[] = ['ALL', 'UR', 'SSR', 'SR', 'R', 'N'];
  const completionPct = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0;

  return (
    <>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes ssr-shine {
          0%   { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
          30%  { opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateX(250%) skewX(-20deg); opacity: 0; }
        }
        @keyframes ur-rainbow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ur-pulse-glow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(244,114,182,0.5), 0 0 20px 4px rgba(168,85,247,0.3); }
          50%       { box-shadow: 0 0 16px 6px rgba(244,114,182,0.8), 0 0 40px 12px rgba(168,85,247,0.5); }
        }
        @keyframes ssr-glow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(251,191,36,0.4), 0 0 20px 4px rgba(251,191,36,0.2); }
          50%       { box-shadow: 0 0 20px 6px rgba(251,191,36,0.7), 0 0 40px 12px rgba(251,191,36,0.4); }
        }
        @keyframes bar-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes sparkle-float {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          20%  { opacity: 1; transform: translateY(-8px) scale(1); }
          80%  { opacity: 0.8; }
          100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
        }
        .ssr-card { animation: ssr-glow 3s ease-in-out infinite; }
        .ssr-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(105deg, transparent 40%, rgba(253,230,138,0.6) 50%, transparent 60%);
          animation: ssr-shine 3s ease-in-out infinite;
          pointer-events: none;
        }
        .ur-card { animation: ur-pulse-glow 2s ease-in-out infinite; }
        .ur-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(105deg,
            transparent 30%,
            rgba(255,100,200,0.5) 42%,
            rgba(100,200,255,0.5) 50%,
            rgba(200,100,255,0.5) 58%,
            transparent 70%
          );
          background-size: 200% 200%;
          animation: ssr-shine 2.5s ease-in-out infinite, ur-rainbow 3s linear infinite;
          pointer-events: none;
        }
        .sparkle-particle { animation: sparkle-float 3s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-gray-950 text-white pb-24">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <Link href="/mypage" className="text-gray-400 hover:text-white transition-colors">
            ← 戻る
          </Link>
          <h1 className="flex-1 text-center font-bold text-lg">カードコレクション</h1>
          <span className="text-sm text-gray-400">{ownedCount}/{totalCards}</span>
        </div>

        {/* 完成率バー */}
        <div className="px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>図鑑完成度</span>
            <span className="font-mono font-bold text-white text-base">{completionPct}%</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899, #f59e0b, #ec4899, #a855f7, #7c3aed)',
                backgroundSize: '400% 100%',
                animation: 'bar-shimmer 3s linear infinite',
              }}
              initial={{ width: 0 }}
              animate={{ width: totalCards > 0 ? `${(ownedCount / totalCards) * 100}%` : '0%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              {/* キラキラ反射 */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
                  backgroundSize: '200% 100%',
                  animation: 'bar-shimmer 1.5s linear infinite',
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* レアリティフィルター */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-gray-800">
          {filters.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                filter === r
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* カードグリッド */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-400 text-sm">
                {filter === 'ALL' ? '最初の一枚を手に入れよう' : `${filter}レアリティのカードはまだありません`}
              </p>
              {filter === 'ALL' && (
                <Link
                  href="/gacha"
                  className="mt-4 inline-block px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-sm font-bold transition-colors"
                >
                  ガチャへ
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((uc, i) => {
                const style = RARITY_STYLES[uc.card.rarity] ?? RARITY_STYLES['N'];
                const bg = RARITY_BG[uc.card.rarity] ?? RARITY_BG['N'];
                const isSSR = uc.card.rarity === 'SSR';
                const isUR = uc.card.rarity === 'UR';
                return (
                  <motion.button
                    key={uc.userCardId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedCard(uc)}
                    className={`relative rounded-xl border-2 ${style.border} ${bg} p-3 text-center shadow-lg ${style.glow}
                      hover:scale-110 hover:shadow-xl transition-all duration-200 overflow-hidden
                      ${isSSR ? 'ssr-card' : ''} ${isUR ? 'ur-card' : ''}`}
                  >
                    {/* レアリティラベル */}
                    <div className={`text-xs font-bold ${style.labelColor} mb-1`}>{style.label}</div>

                    {/* カード画像orアバター */}
                    {uc.card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uc.card.imageUrl}
                        alt={uc.card.name}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-gray-700 flex items-center justify-center text-3xl">
                        {uc.card.character.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={uc.card.character.avatarUrl}
                            alt={uc.card.character.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          '🃏'
                        )}
                      </div>
                    )}

                    {/* カード名 */}
                    <p className="mt-2 text-xs leading-tight line-clamp-2 text-gray-200 font-medium">{uc.card.name}</p>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* カード詳細モーダル */}
        <AnimatePresence>
          {selectedCard && (() => {
            const rarity = selectedCard.card.rarity;
            const isSSR = rarity === 'SSR';
            const isUR = rarity === 'UR';
            const modalBg = MODAL_BG[rarity] ?? MODAL_BG['N'];
            const style = RARITY_STYLES[rarity] ?? RARITY_STYLES['N'];
            return (
              <motion.div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCard(null)}
              >
                <motion.div
                  className={`relative w-full max-w-sm ${modalBg} rounded-t-2xl p-6 border-t ${style.border} overflow-hidden`}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* SSR/URキラキラパーティクル背景 */}
                  {(isSSR || isUR) && <SparkleParticles count={isUR ? 18 : 12} />}

                  <div className="relative z-10">
                    {/* レアリティ */}
                    <div className={`text-center text-base font-bold mb-2 ${style.labelColor}`}>
                      ✦ {style.label} ✦
                    </div>

                    {/* 画像 */}
                    <div className={`mx-auto w-48 h-48 rounded-2xl overflow-hidden mb-4 border-2 ${style.border} shadow-lg ${style.glow}`}>
                      {selectedCard.card.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedCard.card.imageUrl} alt={selectedCard.card.name} className="w-full h-full object-cover" />
                      ) : selectedCard.card.character.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedCard.card.character.avatarUrl} alt={selectedCard.card.character.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-800">🃏</div>
                      )}
                    </div>

                    {/* カード名・キャラ */}
                    <h2 className="text-center font-bold text-xl mb-1">{selectedCard.card.name}</h2>
                    <p className="text-center text-sm text-gray-400 mb-3">{selectedCard.card.character.name}</p>

                    {/* 説明 */}
                    {selectedCard.card.description && (
                      <p className="text-sm text-gray-300 text-center bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/10">
                        {selectedCard.card.description}
                      </p>
                    )}

                    {/* 取得日 */}
                    <p className="text-center text-xs text-gray-500 mb-4">
                      取得: {new Date(selectedCard.obtainedAt).toLocaleDateString('ja-JP')}
                    </p>

                    {/* シェア・お気に入りボタン */}
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={() => {}}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600/80 hover:bg-blue-500 rounded-xl text-sm font-bold transition-all hover:scale-105 border border-blue-400/30"
                      >
                        <span>📤</span> シェア
                      </button>
                      <button
                        onClick={() => setFavorited((f) => !f)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 border ${
                          favorited
                            ? 'bg-pink-600 border-pink-400/50 text-white'
                            : 'bg-gray-700/80 hover:bg-gray-600 border-gray-600/30'
                        }`}
                      >
                        <span>{favorited ? '❤️' : '🤍'}</span>
                        {favorited ? 'お気に入り済' : 'お気に入り'}
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedCard(null)}
                      className="w-full py-2 bg-gray-700/80 hover:bg-gray-600 rounded-xl text-sm transition-colors border border-gray-600/30"
                    >
                      閉じる
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </>
  );
}
