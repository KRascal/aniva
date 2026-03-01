'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Banner {
  id: string;
  name: string;
  description: string | null;
  characterId: string | null;
  rateUp: Record<string, number>;
  startAt: string;
  endAt: string;
}

interface CardResult {
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    rarity: string;
    characterId: string;
  };
  isNew: boolean;
  rarity: string;
}

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  N:   { bg: 'bg-gray-700',    border: 'border-gray-500',  text: 'text-gray-300',   label: 'NORMAL' },
  R:   { bg: 'bg-blue-900',    border: 'border-blue-500',  text: 'text-blue-300',   label: 'RARE' },
  SR:  { bg: 'bg-purple-900',  border: 'border-purple-500',text: 'text-purple-300', label: 'S·RARE' },
  SSR: { bg: 'bg-yellow-900',  border: 'border-yellow-400',text: 'text-yellow-300', label: 'S·S·RARE' },
  UR:  { bg: 'bg-gradient-to-br from-pink-900 via-purple-900 to-blue-900', border: 'border-pink-400', text: 'text-pink-300', label: 'ULTRA RARE' },
};

export default function GachaPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [myCardCount, setMyCardCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [freeGachaAvailable, setFreeGachaAvailable] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [results, setResults] = useState<CardResult[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCoinBalance();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/gacha/banners');
      if (!res.ok) return;
      const data = await res.json();
      setBanners(data.banners ?? []);
      setMyCardCount(data.myCardCount ?? 0);
      setFreeGachaAvailable(data.freeGachaAvailable ?? false);
      if (data.banners?.length > 0) {
        setSelectedBannerId(data.banners[0].id);
      }
    } catch {
      // ignore
    }
  }

  async function fetchCoinBalance() {
    try {
      const res = await fetch('/api/coins/balance');
      if (!res.ok) return;
      const data = await res.json();
      setCoinBalance(data.balance ?? 0);
    } catch {
      // ignore
    }
  }

  async function pull(count: 1 | 10) {
    if (!selectedBannerId || isPulling) return;
    setIsPulling(true);
    setError(null);
    setShowResults(false);

    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId: selectedBannerId, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
        return;
      }
      setResults(data.results ?? []);
      setCoinBalance(data.coinBalance ?? 0);
      setRevealedCount(0);
      setShowResults(true);

      // カードを1枚ずつ演出
      for (let i = 1; i <= (data.results?.length ?? 0); i++) {
        await new Promise((r) => setTimeout(r, 400));
        setRevealedCount(i);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsPulling(false);
    }
  }

  const selectedBanner = banners.find((b) => b.id === selectedBannerId);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🎴 ガチャ</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">所持カード: {myCardCount}枚</span>
            <div className="flex items-center gap-1 bg-yellow-900/40 px-3 py-1 rounded-full border border-yellow-600/40">
              <span className="text-yellow-400">🪙</span>
              <span className="font-bold text-yellow-300">{coinBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* バナー選択 */}
        {banners.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            現在開催中のガチャはありません
          </div>
        ) : (
          <>
            <div className="grid gap-3 mb-6">
              {banners.map((banner) => (
                <button
                  key={banner.id}
                  onClick={() => setSelectedBannerId(banner.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedBannerId === banner.id
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold">{banner.name}</div>
                  {banner.description && (
                    <div className="text-sm text-gray-400 mt-1">{banner.description}</div>
                  )}
                </button>
              ))}
            </div>

            {/* ガチャボタン */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => pull(1)}
                disabled={isPulling || !selectedBannerId}
                className="flex-1 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 font-semibold transition-colors"
              >
                1回引く<br />
                <span className="text-sm font-normal text-indigo-300">100コイン</span>
              </button>
              <button
                onClick={() => pull(10)}
                disabled={isPulling || !selectedBannerId}
                className="flex-1 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-50 font-semibold transition-colors"
              >
                10回引く<br />
                <span className="text-sm font-normal text-purple-300">900コイン</span>
              </button>
            </div>

            {freeGachaAvailable && (
              <div className="text-center text-sm text-green-400 mb-4">
                🎁 本日の無料ガチャが利用可能です！
              </div>
            )}
          </>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* 結果表示 */}
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-lg font-bold mb-4 text-center">
                結果 ({results.filter((_, i) => i < revealedCount && results[i].isNew).length} NEW!)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((result, i) => {
                  const style = RARITY_STYLES[result.rarity] ?? RARITY_STYLES.N;
                  return (
                    <AnimatePresence key={`${result.card.id}-${i}`}>
                      {i < revealedCount && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                          transition={{ type: 'spring', duration: 0.4 }}
                          className={`relative rounded-xl border-2 p-3 ${style.bg} ${style.border}`}
                        >
                          {result.isNew && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                              NEW
                            </div>
                          )}
                          {result.card.imageUrl ? (
                            <img
                              src={result.card.imageUrl}
                              alt={result.card.name}
                              className="w-full aspect-square object-cover rounded-lg mb-2"
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center bg-black/30 text-4xl">
                              🃏
                            </div>
                          )}
                          <div className={`text-xs font-bold mb-0.5 ${style.text}`}>
                            {style.label}
                          </div>
                          <div className="text-sm font-semibold truncate">{result.card.name}</div>
                          {!result.isNew && (
                            <div className="text-xs text-gray-400 mt-1">所持済み</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  );
                })}
              </div>

              {revealedCount >= results.length && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-6"
                >
                  <button
                    onClick={() => setShowResults(false)}
                    className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
                  >
                    閉じる
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
