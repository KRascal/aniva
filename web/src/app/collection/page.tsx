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
  N:   { border: 'border-gray-500',   label: 'N',    glow: '',                         labelColor: 'text-gray-400' },
  R:   { border: 'border-blue-500',   label: 'R',    glow: 'shadow-blue-500/30',        labelColor: 'text-blue-400' },
  SR:  { border: 'border-purple-500', label: 'SR',   glow: 'shadow-purple-500/40',      labelColor: 'text-purple-400' },
  SSR: { border: 'border-yellow-400', label: 'SSR',  glow: 'shadow-yellow-400/50',      labelColor: 'text-yellow-400' },
  UR:  { border: 'border-pink-400',   label: 'UR',   glow: 'shadow-pink-400/60',        labelColor: 'text-pink-400' },
};

const RARITY_BG: Record<string, string> = {
  N:   'bg-gray-800',
  R:   'bg-gradient-to-b from-blue-950 to-gray-900',
  SR:  'bg-gradient-to-b from-purple-950 to-gray-900',
  SSR: 'bg-gradient-to-b from-yellow-950 to-gray-900',
  UR:  'bg-gradient-to-b from-pink-950 via-purple-950 to-gray-900',
};

type FilterRarity = 'ALL' | 'UR' | 'SSR' | 'SR' | 'R' | 'N';

export default function CollectionPage() {
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [filter, setFilter] = useState<FilterRarity>('ALL');
  const [selectedCard, setSelectedCard] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(true);

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

  const filtered = filter === 'ALL' ? cards : cards.filter((c) => c.card.rarity === filter);
  const filters: FilterRarity[] = ['ALL', 'UR', 'SSR', 'SR', 'R', 'N'];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-white transition-colors">
          ← 戻る
        </Link>
        <h1 className="flex-1 text-center font-bold text-lg">カードコレクション</h1>
        <span className="text-sm text-gray-400">{ownedCount}/{totalCards}</span>
      </div>

      {/* 完成率バー */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
          <span>図鑑完成度</span>
          <span className="font-mono text-white">{totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: totalCards > 0 ? `${(ownedCount / totalCards) * 100}%` : '0%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
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
                ? 'bg-purple-600 border-purple-500 text-white'
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
              {filter === 'ALL' ? 'まだカードがありません。ガチャを引いてみよう！' : `${filter}レアリティのカードはまだありません`}
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
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((uc, i) => {
              const style = RARITY_STYLES[uc.card.rarity] ?? RARITY_STYLES['N'];
              const bg = RARITY_BG[uc.card.rarity] ?? RARITY_BG['N'];
              return (
                <motion.button
                  key={uc.userCardId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedCard(uc)}
                  className={`relative rounded-lg border-2 ${style.border} ${bg} p-2 text-center shadow-lg ${style.glow} hover:scale-105 transition-transform`}
                >
                  {/* レアリティラベル */}
                  <div className={`text-xs font-bold ${style.labelColor} mb-1`}>{style.label}</div>

                  {/* カード画像orアバター */}
                  {uc.card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uc.card.imageUrl}
                      alt={uc.card.name}
                      className="w-full aspect-square object-cover rounded"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded bg-gray-700 flex items-center justify-center text-2xl">
                      {uc.card.character.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uc.card.character.avatarUrl}
                          alt={uc.card.character.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        '🃏'
                      )}
                    </div>
                  )}

                  {/* カード名 */}
                  <p className="mt-1 text-xs leading-tight line-clamp-2 text-gray-200">{uc.card.name}</p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* カード詳細モーダル */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              className="w-full max-w-sm bg-gray-900 rounded-t-2xl p-6 border-t border-gray-700"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* レアリティ */}
              <div className={`text-center text-sm font-bold mb-1 ${RARITY_STYLES[selectedCard.card.rarity]?.labelColor ?? 'text-gray-400'}`}>
                {RARITY_STYLES[selectedCard.card.rarity]?.label ?? selectedCard.card.rarity}
              </div>

              {/* 画像 */}
              <div className="mx-auto w-32 h-32 rounded-xl overflow-hidden mb-3 bg-gray-800">
                {selectedCard.card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedCard.card.imageUrl} alt={selectedCard.card.name} className="w-full h-full object-cover" />
                ) : selectedCard.card.character.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedCard.card.character.avatarUrl} alt={selectedCard.card.character.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🃏</div>
                )}
              </div>

              {/* カード名・キャラ */}
              <h2 className="text-center font-bold text-lg">{selectedCard.card.name}</h2>
              <p className="text-center text-sm text-gray-400 mb-2">{selectedCard.card.character.name}</p>

              {/* 説明 */}
              {selectedCard.card.description && (
                <p className="text-sm text-gray-300 text-center bg-gray-800 rounded-lg p-3 mb-3">
                  {selectedCard.card.description}
                </p>
              )}

              {/* 取得日 */}
              <p className="text-center text-xs text-gray-500">
                取得: {new Date(selectedCard.obtainedAt).toLocaleDateString('ja-JP')}
              </p>

              <button
                onClick={() => setSelectedCard(null)}
                className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
