'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { track, EVENTS } from '@/lib/analytics';
import { GachaFlipCard, type GachaRarity } from '@/components/gacha/GachaFlipCard';
import { GachaPackOpening } from '@/components/gacha/GachaPackOpening';
import { playSound } from '@/lib/sound-effects';
import { useCoinPurchase } from '@/components/coins/CoinPurchaseContext';
import { CoinIcon } from '@/components/ui/CoinIcon';

// ── Types ──────────────────────────────────────────────────────────────────
interface GachaBanner {
  id: string;
  name: string;
  description: string | null;
  characterId: string | null;
  rateUp: number | null;
  costCoins: number;
  cost10Coins: number;
  startAt: string;
  endAt: string;
  franchise: string | null;
  bannerImageUrl: string | null;
  themeColor: string | null;
}

interface PullResultCard {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  cardImageUrl: string | null;
  illustrationUrl: string | null;
  frameType: string | null;
  rarity: GachaRarity;
  characterId: string;
  characterSlug: string | null;
  franchise: string | null;
  character?: { id: string; name: string; avatarUrl: string | null };
}

interface PullResult {
  card: PullResultCard;
  isNew: boolean;
  rarity: GachaRarity;
}

interface PityProgress {
  current: number;
  ceiling: number;
  guaranteedRarity: string;
}

// UserCard interface removed (collection in /cards)

// ── Rarity style helpers ───────────────────────────────────────────────────
const RARITY_BG: Record<string, string> = {
  N: 'rgba(75,85,99,0.3)',
  R: 'rgba(30,58,138,0.4)',
  SR: 'rgba(76,29,149,0.5)',
  SSR: 'rgba(120,53,15,0.5)',
  UR: 'rgba(131,24,67,0.5)',
};

const RARITY_STARS: Record<string, string> = {
  N: '★',
  R: '★★',
  SR: '★★★',
  SSR: '★★★★',
  UR: '★★★★★',
};

// ── Gold Particle Canvas ───────────────────────────────────────────────────
function GoldParticles({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
      color: string;
    }

    const particles: Particle[] = [];
    const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a', '#fff'];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: -(2 + Math.random() * 4),
        alpha: 0.8 + Math.random() * 0.2,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.alpha -= 0.012;
        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if (alive) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-20"
    />
  );
}

// ── Pity Progress Bar ──────────────────────────────────────────────────────
function PityProgressBar({ pity }: { pity: PityProgress }) {
  const pct = Math.min(100, (pity.current / pity.ceiling) * 100);
  const remaining = Math.max(0, pity.ceiling - pity.current);

  return (
    <div className="rounded-2xl p-4 mb-4"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-yellow-300 tracking-wide">PITY COUNT</span>
        <span className="text-xs text-gray-400">
          {pity.current} / {pity.ceiling}
        </span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden mb-1"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 80
              ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
              : 'linear-gradient(90deg, #a855f7, #f59e0b)',
          }}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        {remaining === 0
          ? 'NEXT UR GUARANTEED'
          : `あと ${remaining} 回で ${pity.guaranteedRarity} 確定`}
      </p>
    </div>
  );
}

// CollectionCard/SilhouetteCard 廃止（/cardsに統一）

// ── Main Page ──────────────────────────────────────────────────────────────
// コレクションは /cards に統一済み。ガチャページはガチャのみ

/** ガチャメインコンポーネント（/explore/gacha と /cards のガチャタブ共用）
 * embedded=true のとき: sticky headerを非表示（親がheaderを持つため）
 */
export function GachaContent({ embedded = false }: { embedded?: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // コレクションタブ廃止（/cardsに統一）
  const [banners, setBanners] = useState<GachaBanner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<GachaBanner | null>(null);
  const [freeAvailable, setFreeAvailable] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [pityProgress, setPityProgress] = useState<PityProgress | null>(null);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([]);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  // コレクション関連state廃止（/cardsに統一）
  const [showPackOpening, setShowPackOpening] = useState(false);
  const { openCoinPurchase } = useCoinPurchase();

  // Load banners
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/gacha/banners')
      .then(r => r.json())
      .then(data => {
        if (data.banners?.length > 0) {
          setBanners(data.banners);
          setSelectedBanner(data.banners[0]);
        }
        setFreeAvailable(data.freeGachaAvailable ?? false);
        // allCardCount removed (collection in /cards)
      })
      .catch(() => {});

    // Load coin balance
    fetch('/api/coins/balance')
      .then(r => r.json())
      .then(data => setCoinBalance(data.balance ?? 0))
      .catch(() => {});
  }, [status]);

  // Load pity when banner changes
  useEffect(() => {
    if (!selectedBanner || status !== 'authenticated') return;
    fetch(`/api/gacha/pity?bannerId=${selectedBanner.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.current !== undefined) {
          setPityProgress({
            current: data.current,
            ceiling: data.ceiling,
            guaranteedRarity: 'UR',
          });
        }
      })
      .catch(() => {});
  }, [selectedBanner, status]);

  // コレクション関連ロジック廃止（/cardsに統一）

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const handlePull = async (count: 1 | 10, free = false) => {
    if (!selectedBanner || pulling) return;
    setPulling(true);
    setError(null);
    setPullResults([]);
    setFlippedCards([]);
    setShowParticles(false);

    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId: selectedBanner.id, count, free }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '引けませんでした');
        return;
      }

      const results: PullResult[] = data.results ?? [];
      setPullResults(results);
      setFlippedCards(new Array(results.length).fill(false));
      const bestRarity = results.reduce((best, r) => {
        const order = ['N', 'R', 'SR', 'SSR', 'UR'];
        return order.indexOf(r.rarity) > order.indexOf(best) ? r.rarity : best;
      }, 'N' as string);
      track(EVENTS.GACHA_PULLED, { bannerId: selectedBanner.id, rarity: bestRarity });

      if (data.coinBalance !== undefined) setCoinBalance(data.coinBalance);
      if (data.freeGachaAvailable === false) setFreeAvailable(false);
      if (data.pityProgress) setPityProgress(data.pityProgress);

      // パック開封演出を起動
      setShowPackOpening(true);

      // コレクションは/cardsに統一済み
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setPulling(false);
    }
  };

  const flipCard = (index: number) => {
    // SE連動: カードのレアリティに応じた効果音
    const card = pullResults[index];
    if (card) {
      const rarityKey = card.rarity?.toLowerCase() || 'n';
      playSound(`gacha-reveal-${rarityKey}` as Parameters<typeof playSound>[0]);
    }
    setFlippedCards(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const flipAll = () => {
    setFlippedCards(prev => prev.map(() => true));
  };

  // パック開封演出完了 → カード結果表示（全フリップ）
  const handlePackOpeningComplete = useCallback(() => {
    setShowPackOpening(false);
    // 全カードをフリップ済みにして結果表示
    setFlippedCards(prev => prev.map(() => true));
    // パーティクル表示
    const hasHighRarity = pullResults.some(r => r.rarity === 'SR' || r.rarity === 'SSR' || r.rarity === 'UR');
    if (hasHighRarity) {
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 3500);
    }
  }, [pullResults]);

  const handlePackOpeningSkip = useCallback(() => {
    setShowPackOpening(false);
    setFlippedCards(prev => prev.map(() => true));
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasAnyUnflipped = flippedCards.some(f => !f);

  return (
    <div className={embedded ? 'pb-4' : 'min-h-screen bg-gray-950 pb-24'}>
      {/* パック開封演出 */}
      {showPackOpening && pullResults.length > 0 && (
        <GachaPackOpening
          cards={pullResults}
          onComplete={handlePackOpeningComplete}
          onSkip={handlePackOpeningSkip}
        />
      )}

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-yellow-600/08 blur-3xl" />
      </div>

      {/* Particles layer */}
      <div className="fixed inset-0 pointer-events-none z-20">
        <GoldParticles active={showParticles} />
      </div>

      {/* Header — 単独ページ時のみ表示（/cards埋め込み時は非表示） */}
      {!embedded && (
        <header className="sticky top-0 z-30 border-b border-white/5"
          style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(12px)' }}
        >
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3 flex items-center gap-3">
            <h1 className="text-lg font-black text-white flex-1 tracking-tight">GACHA</h1>
            <button
              onClick={() => openCoinPurchase(coinBalance)}
              className="flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(250,204,21,0.3)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-400/60">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              <CoinIcon size={14} />
              <span className="text-yellow-300 text-sm font-bold ml-0.5">{coinBalance.toLocaleString()}</span>
            </button>
          </div>
        </header>
      )}

      {/* コイン残高 — embedded時はコンパクト表示 */}
      {embedded && (
        <div className="px-4 pt-3 pb-1 flex justify-end">
          <button
            onClick={() => openCoinPurchase(coinBalance)}
            className="flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(250,204,21,0.3)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-400/60">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            <CoinIcon size={14} />
            <span className="text-yellow-300 text-sm font-bold ml-0.5">{coinBalance.toLocaleString()}</span>
          </button>
        </div>
      )}

      <main className="relative z-10 max-w-lg mx-auto px-4 py-4">
        {/* ── GACHA CONTENT ── */}
        {(
          <div>
            {/* Banner selector */}
            {banners.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-400">
                    <rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M2 10h20"/>
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">現在開催中のガチャはありません</p>
              </div>
            ) : (
              <>
                {/* Banner list */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {banners.map(banner => (
                    <button
                      key={banner.id}
                      onClick={() => setSelectedBanner(banner)}
                      className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                      style={selectedBanner?.id === banner.id ? {
                        background: banner.themeColor
                          ? `linear-gradient(135deg, ${banner.themeColor}44, ${banner.themeColor}22)`
                          : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))',
                        border: `1px solid ${banner.themeColor ?? '#8b5cf6'}66`,
                        color: 'white',
                        minWidth: 140,
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)',
                        minWidth: 140,
                      }}
                    >
                      <p className="font-bold text-sm">{banner.name}</p>
                      {banner.franchise && (
                        <p className="text-[10px] opacity-70">{banner.franchise}</p>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected banner detail */}
                {selectedBanner && (
                  <div className="mb-4">
                    {/* Banner image */}
                    {selectedBanner.bannerImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedBanner.bannerImageUrl}
                        alt={selectedBanner.name}
                        className="w-full h-36 object-cover rounded-2xl mb-3"
                      />
                    ) : (
                      <div
                        className="w-full h-36 rounded-2xl flex items-center justify-center mb-3 relative overflow-hidden"
                        style={{
                          background: selectedBanner.themeColor
                            ? `linear-gradient(135deg, ${selectedBanner.themeColor}33, ${selectedBanner.themeColor}11)`
                            : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                            </svg>
                          </div>
                          <p className="text-white font-bold text-lg tracking-tight">{selectedBanner.name}</p>
                          {selectedBanner.franchise && (
                            <p className="text-white/40 text-[11px] font-medium tracking-wider uppercase">{selectedBanner.franchise}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedBanner.description && (
                      <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                        {selectedBanner.description}
                      </p>
                    )}

                    {/* Pity progress bar */}
                    {pityProgress && <PityProgressBar pity={pityProgress} />}

                    {/* Error */}
                    {error && (
                      <div className="rounded-xl p-3 mb-3 text-red-300 text-sm text-center"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        {error}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {/* Free gacha */}
                      <button
                        onClick={() => handlePull(1, true)}
                        disabled={!freeAvailable || pulling}
                        className="col-span-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 relative"
                        style={freeAvailable ? {
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
                        } : {
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {/* FREE badge removed — button itself says FREE */}
                        <span className="block text-sm font-black mb-0.5 tracking-tight">FREE</span>
                        <span className="text-[10px] opacity-80">1日1回</span>
                      </button>

                      {/* 1 pull */}
                      <button
                        onClick={() => handlePull(1)}
                        disabled={pulling || coinBalance < selectedBanner.costCoins}
                        className="col-span-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                        style={coinBalance >= selectedBanner.costCoins ? {
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(109,40,217,0.8))',
                          color: 'white',
                          boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                          border: '1px solid rgba(139,92,246,0.4)',
                        } : {
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <span className="block text-sm font-black mb-0.5">×1</span>
                        <span className="text-[10px] opacity-80">{selectedBanner.costCoins} coin</span>
                      </button>

                      {/* 10 pull */}
                      <button
                        onClick={() => handlePull(10)}
                        disabled={pulling || coinBalance < selectedBanner.cost10Coins}
                        className="col-span-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 relative"
                        style={coinBalance >= selectedBanner.cost10Coins ? {
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: 'white',
                          boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                        } : {
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <span className="absolute -top-1 -right-1 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #dc2626)', letterSpacing: '0.05em' }}>
                          BEST
                        </span>
                        <span className="block text-sm font-black mb-0.5">×10</span>
                        <span className="text-[10px] opacity-80">{selectedBanner.cost10Coins} coin</span>
                      </button>
                    </div>

                    {/* Pulling spinner */}
                    {pulling && (
                      <div className="flex justify-center py-4">
                        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* Results overlay — centered on screen (hidden during pack opening) */}
                {pullResults.length > 0 && !showPackOpening && (
                  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(3,7,18,0.96)', backdropFilter: 'blur(12px)' }}>
                    <div className="w-full max-w-lg px-4 overflow-y-auto" style={{ maxHeight: '85vh' }}>
                      <div className="flex items-center justify-between mb-4 pt-2">
                        <h2 className="text-white font-bold text-base">結果</h2>
                        <div className="flex items-center gap-2">
                          {hasAnyUnflipped && (
                            <button
                              onClick={flipAll}
                              className="text-xs px-3 py-1.5 rounded-full text-purple-300 font-semibold"
                              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
                            >
                              全部開く
                            </button>
                          )}
                          <button
                            onClick={() => { setPullResults([]); setFlippedCards([]); }}
                            className="text-xs px-3 py-1.5 rounded-full text-white/60 font-semibold"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                      <div className={`grid ${pullResults.length === 1 ? 'grid-cols-1 max-w-[200px] mx-auto' : 'grid-cols-2'} gap-3`}>
                        {pullResults.map((result, i) => (
                          <div key={i} className="relative">
                            {(result.rarity === 'SSR' || result.rarity === 'UR') && flippedCards[i] && (
                              <div
                                className="absolute -inset-2 rounded-2xl blur-md pointer-events-none z-0"
                                style={{
                                  background: result.rarity === 'UR'
                                    ? 'radial-gradient(ellipse, rgba(244,114,182,0.4), transparent 70%)'
                                    : 'radial-gradient(ellipse, rgba(250,204,21,0.35), transparent 70%)',
                                }}
                              />
                            )}
                            <div className="relative z-10">
                              <GachaFlipCard
                                rarity={result.rarity}
                                characterName={result.card.franchise ?? 'キャラクター'}
                                characterAvatarUrl={result.card.cardImageUrl ?? result.card.imageUrl ?? result.card.illustrationUrl ?? result.card.character?.avatarUrl ?? null}
                                itemName={result.card.name}
                                isFlipped={flippedCards[i] ?? false}
                                onFlip={() => flipCard(i)}
                                isNew={result.isNew}
                                frameType={result.card.frameType}
                                franchise={result.card.franchise}
                              />
                            </div>
                            {result.isNew && flippedCards[i] && (
                              <div className="text-center mt-1">
                                <span className="text-[10px] text-green-400 font-bold tracking-wide">NEW</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* もう一回引くボタン */}
                      <div className="mt-6 pb-4">
                        <button
                          onClick={() => { setPullResults([]); setFlippedCards([]); }}
                          className="w-full py-3 rounded-2xl text-sm font-bold text-white/80 transition-all active:scale-[0.97]"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          もう一度引く
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* コレクションタブ廃止（/cardsに統一） */}
      </main>

      {/* コイン購入モーダルはグローバル（layout.tsx CoinPurchaseProvider） */}
    </div>
  );
}

/** Next.js page route */
export default function GachaPage() {
  return <GachaContent />;
}
