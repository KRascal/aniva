'use client';

import React, { useState, useEffect, useRef, useCallback, Component, type ErrorInfo, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GachaFlipCard, type GachaRarity } from '@/components/gacha/GachaFlipCard';

// Error Boundary
class TabErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[Cards] Tab error:', error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <p className="text-4xl mb-3">😵</p>
          <p className="text-white/60 text-sm mb-2">読み込みエラーが発生しました</p>
          <p className="text-red-400/60 text-[10px] mb-3 break-all">{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold">再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface OwnedCard {
  userCardId: string;
  obtainedAt: string;
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    rarity: string;
    category: string | null;
    character: { id: string; name: string; avatarUrl: string | null } | null;
  };
}

interface GachaBanner {
  id: string;
  name: string;
  description: string | null;
  characterId: string | null;
  costCoins: number;
  cost10Coins: number;
  startAt: string;
  endAt: string;
  franchise: string | null;
  bannerImageUrl: string | null;
  themeColor: string | null;
  rateUp: number | Record<string, number> | null;
}

interface PullResultCard {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  cardImageUrl: string | null;
  illustrationUrl: string | null;
  rarity: GachaRarity;
  category: string | null;
  character: { id: string; name: string; avatarUrl: string | null } | null;
  isNew: boolean;
  frameType: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Rarity helpers
// ═══════════════════════════════════════════════════════════════

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  UR: { bg: 'from-amber-400 via-yellow-300 to-amber-500', border: 'border-amber-400', text: 'text-amber-300', glow: 'shadow-amber-500/50' },
  SSR: { bg: 'from-purple-500 via-pink-400 to-purple-600', border: 'border-purple-400', text: 'text-purple-300', glow: 'shadow-purple-500/50' },
  SR: { bg: 'from-blue-500 via-cyan-400 to-blue-600', border: 'border-blue-400', text: 'text-blue-300', glow: 'shadow-blue-500/40' },
  R: { bg: 'from-green-500 to-emerald-600', border: 'border-green-500', text: 'text-green-400', glow: 'shadow-green-500/30' },
  N: { bg: 'from-gray-500 to-gray-600', border: 'border-gray-500', text: 'text-gray-400', glow: '' },
};

function getRarityStyle(rarity: string) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.N;
}

// ═══════════════════════════════════════════════════════════════
// Card Collection Tab
// ═══════════════════════════════════════════════════════════════

function CardCollectionTab() {
  const [cards, setCards] = useState<OwnedCard[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gacha/cards')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        setCards(data.cards ?? []);
        setTotalCards(data.totalCards ?? 0);
      })
      .catch(() => { setCards([]); setTotalCards(0); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterRarity ? cards.filter(c => c.card.rarity === filterRarity) : cards;
  const rarities = ['UR', 'SSR', 'SR', 'R', 'N'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <div>
            <p className="text-white font-bold text-lg">{cards.length}<span className="text-white/40 text-sm font-normal">/{totalCards}</span></p>
            <p className="text-white/40 text-[10px]">コレクション</p>
          </div>
        </div>
        {/* Completion bar */}
        <div className="flex-1 max-w-[160px] ml-4">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${totalCards > 0 ? (cards.length / totalCards) * 100 : 0}%` }}
            />
          </div>
          <p className="text-white/30 text-[9px] text-right mt-0.5">{totalCards > 0 ? Math.round((cards.length / totalCards) * 100) : 0}% Complete</p>
        </div>
      </div>

      {/* Rarity Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setFilterRarity(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
            !filterRarity ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          ALL
        </button>
        {rarities.map(r => {
          const style = getRarityStyle(r);
          const count = cards.filter(c => c.card.rarity === r).length;
          return (
            <button
              key={r}
              onClick={() => setFilterRarity(filterRarity === r ? null : r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                filterRarity === r ? `bg-gradient-to-r ${style.bg} text-white` : `bg-gray-800 ${style.text} hover:brightness-125`
              }`}
            >
              {r} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🎴</p>
          <p className="text-white/60 text-sm">カードがまだありません</p>
          <p className="text-white/30 text-xs mt-1">ガチャを引いてコレクションを始めよう！</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((oc) => {
            const style = getRarityStyle(oc.card.rarity);
            return (
              <button
                key={oc.userCardId}
                onClick={() => setSelectedCard(oc)}
                className={`relative bg-gray-900 rounded-xl overflow-hidden border ${style.border} shadow-lg ${style.glow} active:scale-95 transition-all group`}
                style={{ aspectRatio: '3/4' }}
              >
                {/* Card image or avatar fallback */}
                {oc.card.imageUrl ? (
                  <img src={oc.card.imageUrl} alt={oc.card.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : oc.card.character?.avatarUrl ? (
                  <img src={oc.card.character.avatarUrl} alt={oc.card.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-30`} />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {/* Rarity badge */}
                <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r ${style.bg} text-white shadow-sm`}>
                  {oc.card.rarity}
                </div>
                {/* Name */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-[11px] font-bold truncate drop-shadow">{oc.card.name}</p>
                  {oc.card.character && (
                    <p className="text-white/50 text-[9px] truncate">{oc.card.character.name}</p>
                  )}
                </div>
                {/* Shine overlay on hover/focus */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/10 via-transparent to-transparent" />
              </button>
            );
          })}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-gray-900 rounded-3xl p-6 max-w-[320px] w-full border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Card image large */}
            <div className={`relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 ${getRarityStyle(selectedCard.card.rarity).border} mb-4`}>
              {selectedCard.card.imageUrl ? (
                <img src={selectedCard.card.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : selectedCard.card.character?.avatarUrl ? (
                <img src={selectedCard.card.character.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getRarityStyle(selectedCard.card.rarity).bg} opacity-40`} />
              )}
              <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-black bg-gradient-to-r ${getRarityStyle(selectedCard.card.rarity).bg} text-white`}>
                {selectedCard.card.rarity}
              </div>
            </div>
            <h3 className="text-white text-lg font-bold mb-1">{selectedCard.card.name}</h3>
            {selectedCard.card.character && <p className="text-purple-400 text-sm mb-2">{selectedCard.card.character.name}</p>}
            {selectedCard.card.description && <p className="text-white/50 text-sm mb-3">{selectedCard.card.description}</p>}
            <p className="text-white/30 text-xs">入手: {new Date(selectedCard.obtainedAt).toLocaleDateString('ja-JP')}</p>
            <button
              onClick={() => setSelectedCard(null)}
              className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-3 text-sm font-bold transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Gacha Tab (pulled from explore/gacha with simplifications)
// ═══════════════════════════════════════════════════════════════

function GachaTab() {
  const [banners, setBanners] = useState<GachaBanner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<GachaBanner | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [pullResults, setPullResults] = useState<PullResultCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [pityProgress, setPityProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [freeAvailable, setFreeAvailable] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch banners + coins
  useEffect(() => {
    Promise.allSettled([
      fetch('/api/gacha/banners').then(r => r.json()).catch(() => ({})),
      fetch('/api/coins/balance').then(r => r.json()).catch(() => ({})),
    ]).then(async (results) => {
      const bannerData = results[0].status === 'fulfilled' ? results[0].value : {};
      const coinData = results[1].status === 'fulfilled' ? results[1].value : {};
      const b = Array.isArray(bannerData.banners) ? bannerData.banners : [];
      setBanners(b);
      setFreeAvailable(!!bannerData.freeGachaAvailable);
      if (b.length > 0) {
        setSelectedBanner(b[0]);
        // pity情報はbannerId必須なのでバナー取得後に呼ぶ
        try {
          const pityRes = await fetch(`/api/gacha/pity?bannerId=${b[0].id}`);
          if (pityRes.ok) {
            const pityData = await pityRes.json();
            const cur = Number(pityData.current) || 0;
            const ceil = Number(pityData.ceiling) || 100;
            setPityProgress(ceil > 0 ? (cur / ceil) * 100 : 0);
          }
        } catch {}
      }
      setCoinBalance(Number(coinData.balance) || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Gold particle effect
  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        size: Math.random() * 4 + 2,
        alpha: 1,
        color: ['#FFD700', '#FFA500', '#FF69B4', '#9333EA'][Math.floor(Math.random() * 4)],
      });
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= 0.01;
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(animate);
  }, []);

  const doPull = async (count: 1 | 10 | 'free') => {
    if (!selectedBanner || pulling) return;
    setPulling(true);
    setPullResults([]);
    setFlippedCards(new Set());
    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannerId: selectedBanner.id,
          count: count === 'free' ? 1 : count,
          free: count === 'free',
        }),
      });
      const data = await res.json();
      if (data.error) return;
      // APIは { results: PullResult[], coinBalance, pityProgress } を返す
      // PullResult = { card: {...}, isNew, rarity, pityInfo }
      const rawResults = data.results ?? data.cards ?? [];
      const mappedCards: PullResultCard[] = rawResults.map((r: Record<string, unknown>) => {
        // r が { card: {...}, isNew, rarity } 形式の場合と、フラット形式の両方に対応
        const card = (r.card && typeof r.card === 'object') ? r.card as Record<string, unknown> : r;
        return {
          id: String(card.id ?? ''),
          name: String(card.name ?? '???'),
          description: card.description as string | null ?? null,
          imageUrl: card.imageUrl as string | null ?? null,
          cardImageUrl: card.cardImageUrl as string | null ?? null,
          illustrationUrl: card.illustrationUrl as string | null ?? null,
          rarity: (card.rarity ?? r.rarity ?? 'N') as GachaRarity,
          category: card.category as string | null ?? null,
          character: card.character && typeof card.character === 'object'
            ? card.character as { id: string; name: string; avatarUrl: string | null }
            : null,
          isNew: !!(r.isNew ?? card.isNew),
          frameType: (card.frameType as string | null) ?? null,
        };
      });
      setPullResults(mappedCards);
      setCoinBalance(Number(data.coinBalance ?? data.remainingCoins) || coinBalance);
      // pityProgress from pull response
      const pp = data.pityProgress;
      if (pp && typeof pp === 'object') {
        const cur = Number(pp.current) || 0;
        const ceil = Number(pp.ceiling) || 100;
        setPityProgress(ceil > 0 ? (cur / ceil) * 100 : 0);
      }
      if (count === 'free') setFreeAvailable(false);
      // SR以上ならパーティクル
      if (mappedCards.some((c: PullResultCard) => ['SR', 'SSR', 'UR'].includes(c.rarity))) {
        setTimeout(spawnParticles, 300);
      }
    } catch {}
    finally { setPulling(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 relative">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50" />

      {/* Coin balance */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-3 py-1.5">
          <span className="text-lg">🪙</span>
          <span className="text-yellow-300 font-bold">{coinBalance.toLocaleString()}</span>
        </div>
        {/* Pity progress */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">天井</span>
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${pityProgress}%` }} />
          </div>
          <span className="text-purple-400 text-xs font-bold">{Math.round(pityProgress)}%</span>
        </div>
      </div>

      {/* Banner selection */}
      {banners.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {banners.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBanner(b)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedBanner?.id === b.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Selected banner info */}
      {selectedBanner && (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-4 mb-4 border border-white/5">
          <h3 className="text-white font-bold text-lg mb-1">{selectedBanner.name}</h3>
          {selectedBanner.description && <p className="text-white/50 text-sm mb-3">{selectedBanner.description}</p>}
          {selectedBanner.rateUp && (
            <div className="space-y-1 mb-3">
              {typeof selectedBanner.rateUp === 'object' ? (
                Object.entries(selectedBanner.rateUp).map(([cardId, rate]) => (
                  <div key={cardId} className="inline-block bg-pink-500/20 text-pink-400 text-xs font-bold px-2 py-1 rounded-lg mr-1">
                    ★ {cardId.replace(/^gc-/, '').replace(/-\d+$/, '').replace(/-/g, ' ')} {rate}倍
                  </div>
                ))
              ) : (
                <div className="inline-block bg-pink-500/20 text-pink-400 text-xs font-bold px-2 py-1 rounded-lg">
                  ★ ピックアップ確率 {selectedBanner.rateUp}倍
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pull Results */}
      {pullResults.length > 0 && (
        <div className="mb-6">
          <p className="text-white/60 text-sm mb-3 text-center">タップしてカードをめくろう！</p>
          <div className={`grid ${pullResults.length > 1 ? 'grid-cols-5' : 'grid-cols-1 max-w-[200px] mx-auto'} gap-2`}>
            {pullResults.map((card, i) => (
              <GachaFlipCard
                key={`${card.id}-${i}`}
                rarity={card.rarity}
                characterName={card.character?.name ?? '???'}
                characterAvatarUrl={card.character?.avatarUrl ?? null}
                itemName={card.name}
                isFlipped={flippedCards.has(i)}
                onFlip={() => setFlippedCards(prev => new Set(prev).add(i))}
                isNew={card.isNew}
                frameType={card.frameType}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pull Buttons */}
      <div className="space-y-3">
        {freeAvailable && (
          <button
            onClick={() => doPull('free')}
            disabled={pulling}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 rounded-2xl py-4 font-black text-lg shadow-lg shadow-amber-500/30 active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {pulling ? '...' : '🎁 無料1回'}
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => doPull(1)}
            disabled={pulling || !selectedBanner}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl py-3.5 font-bold text-base shadow-lg shadow-purple-500/30 active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {pulling ? '...' : `1回 🪙${selectedBanner?.costCoins ?? 100}`}
          </button>
          <button
            onClick={() => doPull(10)}
            disabled={pulling || !selectedBanner}
            className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700 text-white rounded-2xl py-3.5 font-bold text-base shadow-lg shadow-purple-500/30 active:scale-[0.97] transition-transform disabled:opacity-50 border border-purple-400/30"
          >
            {pulling ? '...' : `10連 🪙${selectedBanner?.cost10Coins ?? 900}`}
          </button>
        </div>
      </div>

      {banners.length === 0 && (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">🎰</p>
          <p className="text-white/60 text-sm">現在開催中のガチャはありません</p>
          <p className="text-white/30 text-xs mt-1">次回のバナーをお楽しみに！</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Cards Page (Main)
// ═══════════════════════════════════════════════════════════════

export default function CardsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'collection' | 'gacha'>('collection');
  const touchStartX = useRef(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 80) {
      if (dx < 0 && activeTab === 'collection') setActiveTab('gacha');
      else if (dx > 0 && activeTab === 'gacha') setActiveTab('collection');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            🃏 カード
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="max-w-lg mx-auto px-4 pb-2">
          <div className="relative flex bg-gray-800/60 rounded-xl p-1">
            {/* Sliding indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 ease-out"
              style={{
                left: activeTab === 'collection' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
            />
            <button
              onClick={() => setActiveTab('collection')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${
                activeTab === 'collection' ? 'text-white' : 'text-gray-400'
              }`}
            >
              コレクション
            </button>
            <button
              onClick={() => setActiveTab('gacha')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${
                activeTab === 'gacha' ? 'text-white' : 'text-gray-400'
              }`}
            >
              ガチャ
            </button>
          </div>
        </div>
      </header>

      {/* Content with swipe */}
      <div
        className="max-w-lg mx-auto overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: activeTab === 'collection' ? 'translateX(0)' : 'translateX(-50%)', width: '200%' }}
        >
          <div className="w-1/2 min-h-[60vh]">
            <TabErrorBoundary><CardCollectionTab /></TabErrorBoundary>
          </div>
          <div className="w-1/2 min-h-[60vh]">
            {activeTab === 'gacha' ? <TabErrorBoundary key="gacha"><GachaTab /></TabErrorBoundary> : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}
