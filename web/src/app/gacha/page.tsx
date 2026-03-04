'use client';

import { useState, useEffect, useCallback } from 'react';
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

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string; glow: string }> = {
  N:   { bg: 'bg-gray-700',    border: 'border-gray-500',  text: 'text-gray-300',   label: 'NORMAL',      glow: '' },
  R:   { bg: 'bg-blue-900',    border: 'border-blue-500',  text: 'text-blue-300',   label: 'RARE',         glow: '' },
  SR:  { bg: 'bg-purple-900',  border: 'border-purple-500',text: 'text-purple-300', label: 'S·RARE',       glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]' },
  SSR: { bg: 'bg-yellow-900',  border: 'border-yellow-400',text: 'text-yellow-300', label: 'S·S·RARE',     glow: 'shadow-[0_0_30px_rgba(250,204,21,0.7)]' },
  UR:  { bg: 'bg-gradient-to-br from-pink-900 via-purple-900 to-blue-900', border: 'border-pink-400', text: 'text-pink-300', label: 'ULTRA RARE', glow: 'shadow-[0_0_40px_rgba(244,114,182,0.8)]' },
};

// カード1枚コンポーネント（タップでフリップ）
function FlipCard({ result, index, isRevealed, onReveal }: {
  result: CardResult;
  index: number;
  isRevealed: boolean;
  onReveal: (index: number) => void;
}) {
  const style = RARITY_STYLES[result.rarity] ?? RARITY_STYLES.N;
  const isHighRarity = result.rarity === 'SSR' || result.rarity === 'UR';

  return (
    <>
      <style>{`
        .card-scene {
          perspective: 800px;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 12px;
          overflow: hidden;
        }
        .card-back {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(99, 102, 241, 0.5);
          cursor: pointer;
        }
        .card-front {
          transform: rotateY(180deg);
        }
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.5); }
          50% { box-shadow: 0 0 40px rgba(250, 204, 21, 0.9), 0 0 80px rgba(250, 204, 21, 0.4); }
        }
        @keyframes urGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(244, 114, 182, 0.6); }
          33% { box-shadow: 0 0 50px rgba(168, 85, 247, 0.8), 0 0 100px rgba(168, 85, 247, 0.4); }
          66% { box-shadow: 0 0 50px rgba(59, 130, 246, 0.8), 0 0 100px rgba(59, 130, 246, 0.4); }
        }
        .ssr-glow { animation: cardGlow 1.5s ease-in-out infinite; }
        .ur-glow { animation: urGlow 2s ease-in-out infinite; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="card-scene" style={{ height: '200px' }}>
        <div className={`card-inner ${isRevealed ? 'flipped' : ''}`}>
          {/* カード裏面（未めくり） */}
          <div
            className="card-face card-back"
            onClick={() => !isRevealed && onReveal(index)}
          >
            <div className="flex flex-col items-center gap-2 select-none">
              <span className="text-4xl">🃏</span>
              <span className="text-xs text-indigo-300 font-medium">タップでめくる</span>
              <div className="shimmer-bg absolute inset-0 rounded-xl pointer-events-none" />
            </div>
          </div>
          {/* カード表面（公開後） */}
          <div className="card-face card-front">
            <div
              className={`relative w-full h-full border-2 p-3 flex flex-col ${style.bg} ${style.border} ${isRevealed && result.rarity === 'SSR' ? 'ssr-glow' : ''} ${isRevealed && result.rarity === 'UR' ? 'ur-glow' : ''}`}
              style={{ borderRadius: '12px' }}
            >
              {result.isNew && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold z-10">
                  NEW
                </div>
              )}
              {isHighRarity && isRevealed && (
                <div className="absolute inset-0 shimmer-bg pointer-events-none rounded-xl" />
              )}
              {result.card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.card.imageUrl}
                  alt={result.card.name}
                  className="w-full flex-1 object-cover rounded-lg mb-2 min-h-0"
                />
              ) : (
                <div className="w-full flex-1 rounded-lg mb-2 flex items-center justify-center bg-black/30 text-4xl min-h-0">
                  🃏
                </div>
              )}
              <div className={`text-xs font-bold mb-0.5 ${style.text}`}>
                {style.label}
              </div>
              <div className="text-sm font-semibold truncate text-white">{result.card.name}</div>
              {!result.isNew && (
                <div className="text-xs text-gray-400 mt-0.5">所持済み</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function GachaPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [myCardCount, setMyCardCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [freeGachaAvailable, setFreeGachaAvailable] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [results, setResults] = useState<CardResult[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
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

  const handleReveal = useCallback((index: number) => {
    setRevealedSet((prev) => new Set([...prev, index]));
  }, []);

  const handleRevealAll = useCallback(async () => {
    // 順番にめくる演出
    for (let i = 0; i < results.length; i++) {
      await new Promise((r) => setTimeout(r, 150));
      setRevealedSet((prev) => new Set([...prev, i]));
    }
  }, [results.length]);

  async function pull(count: 1 | 10) {
    if (!selectedBannerId || isPulling) return;
    setIsPulling(true);
    setError(null);
    setShowResults(false);
    setRevealedSet(new Set());

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
      setShowResults(true);

      // デイリーミッション: gacha_pull 自動完了（1セッション1回）
      if (!sessionStorage.getItem('mission_triggered_gacha_pull')) {
        sessionStorage.setItem('mission_triggered_gacha_pull', '1');
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId: 'gacha_pull' }),
        }).catch(() => {/* ignore */});
      }

      // 1回引きは自動でめくる
      if (count === 1) {
        await new Promise((r) => setTimeout(r, 300));
        setRevealedSet(new Set([0]));
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsPulling(false);
    }
  }

  const allRevealed = results.length > 0 && revealedSet.size >= results.length;
  const newCount = results.filter((r, i) => revealedSet.has(i) && r.isNew).length;
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

        {/* 結果表示（フリップカード） */}
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  結果
                  {newCount > 0 && (
                    <span className="ml-2 text-green-400 text-sm">✨ {newCount} NEW!</span>
                  )}
                </h2>
                <div className="flex gap-2">
                  {!allRevealed && results.length > 1 && (
                    <button
                      onClick={handleRevealAll}
                      className="px-4 py-1.5 rounded-lg bg-indigo-700/80 hover:bg-indigo-600 text-sm font-medium transition-colors"
                    >
                      全部めくる
                    </button>
                  )}
                  {allRevealed && (
                    <button
                      onClick={() => setShowResults(false)}
                      className="px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
                    >
                      閉じる
                    </button>
                  )}
                </div>
              </div>

              {/* カードグリッド */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((result, i) => (
                  <FlipCard
                    key={`${result.card.id}-${i}`}
                    result={result}
                    index={i}
                    isRevealed={revealedSet.has(i)}
                    onReveal={handleReveal}
                  />
                ))}
              </div>

              {/* めくり残り表示 */}
              {!allRevealed && results.length > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mt-4 text-sm text-gray-400"
                >
                  残り {results.length - revealedSet.size} 枚 — タップしてめくろう
                </motion.div>
              )}

              {/* 全めくり完了後の閉じるボタン */}
              {allRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-6"
                >
                  <button
                    onClick={() => setShowResults(false)}
                    className="px-8 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors font-medium"
                  >
                    コレクションを見る →
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
