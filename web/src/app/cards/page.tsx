'use client';

import React, { useState, useEffect, useRef, useCallback, Component, type ErrorInfo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
          <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
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
// HoloCardThumbnail - ポケモンポケット風カードエフェクト付きサムネイル
// ═══════════════════════════════════════════════════════════════

function HoloCardThumbnail({ oc, onClick }: { oc: OwnedCard; onClick: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);

  const rarity = oc.card.rarity;
  const style = getRarityStyle(rarity);
  const isHolo = ['SR', 'SSR', 'UR'].includes(rarity);
  const isSSRPlus = ['SSR', 'UR'].includes(rarity);
  const isUR = rarity === 'UR';

  const rotX = isHovering ? (mouse.y - 0.5) * -12 : 0;
  const rotY = isHovering ? (mouse.x - 0.5) * 12 : 0;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setMouse({ x: 0.5, y: 0.5 }); }}
      onClick={onClick}
      style={{
        aspectRatio: '3/4',
        transform: `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        transition: isHovering ? 'transform 0.08s ease' : 'transform 0.5s ease',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        boxShadow: [
          '0 0 0 1px rgba(255,255,255,0.08)',
          '0 4px 8px rgba(0,0,0,0.4)',
          '0 8px 16px rgba(0,0,0,0.3)',
          '0 16px 32px rgba(0,0,0,0.15)',
        ].join(', '),
        borderRadius: '12px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      className={`bg-gray-900 border active:scale-95 transition-[transform,box-shadow] ${style.border} ${style.glow}`}
    >
      {/* Card image or avatar fallback */}
      {oc.card.imageUrl ? (
        <img src={oc.card.imageUrl} alt={oc.card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      ) : oc.card.character?.avatarUrl ? (
        <img src={oc.card.character.avatarUrl} alt={oc.card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-30`} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Rarity badge */}
      <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-black bg-gradient-to-r ${style.bg} text-white shadow-sm z-10`}>
        {rarity}
      </div>

      {/* Card name */}
      <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
        <p className="text-white text-xs font-bold truncate drop-shadow">{oc.card.name}</p>
        {oc.card.character && (
          <p className="text-white/50 text-xs truncate">{oc.card.character.name}</p>
        )}
      </div>

      {/* ホログラムオーバーレイ（SR以上） */}
      {isHolo && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `conic-gradient(from ${mouse.x * 360}deg, #ff0080, #ff8c00, #40e0d0, #0080ff, #8800ff, #ff0080)`,
            opacity: isUR ? (isHovering ? 0.45 : 0.15) : (isHovering ? 0.3 : 0.08),
            mixBlendMode: 'color-dodge',
            transition: isHovering ? 'opacity 0.2s ease' : 'opacity 0.5s ease',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* マウス追従ライト */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(255,255,255,0.15) 0%, transparent 55%)`,
          pointerEvents: 'none',
          zIndex: 6,
          transition: isHovering ? 'none' : 'background 0.5s ease',
        }}
      />

      {/* キラキラ星（SSR/UR） */}
      {isSSRPlus && Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: i % 3 === 0 ? 4 : 2,
            height: i % 3 === 0 ? 4 : 2,
            borderRadius: '50%',
            background: 'white',
            left: `${10 + i * 12}%`,
            top: `${15 + Math.sin(i * 1.2) * 35 + Math.cos(i * 0.8) * 12}%`,
            opacity: isHovering ? (i % 2 === 0 ? 0.95 : 0.7) : 0.2,
            boxShadow: isUR
              ? '0 0 6px 2px rgba(255,200,50,0.8), 0 0 12px rgba(255,180,0,0.5)'
              : '0 0 5px white, 0 0 10px rgba(255,255,255,0.5)',
            transform: `translate(${(mouse.x - 0.5) * 8}px, ${(mouse.y - 0.5) * 8}px)`,
            transition: isHovering ? 'transform 0.08s ease, opacity 0.2s ease' : 'all 0.5s ease',
            pointerEvents: 'none',
            zIndex: 7,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Card Detail Modal — 3Dインタラクティブ ホログラフィックカード表示
// ═══════════════════════════════════════════════════════════════

function CardDetailModal({ card, onClose }: { card: OwnedCard; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);

  const rarity = card.card.rarity;
  const style = getRarityStyle(rarity);
  const isHolo = ['SR', 'SSR', 'UR'].includes(rarity);
  const isUR = rarity === 'UR';
  const isSSRPlus = ['SSR', 'UR'].includes(rarity);

  const rotX = (mouse.y - 0.5) * -20;
  const rotY = (mouse.x - 0.5) * 20;

  const handleMove = (clientX: number, clientY: number) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <style>{`
        @keyframes modalCardAppear {
          0% { transform: perspective(800px) rotateY(-30deg) scale(0.7); opacity: 0; }
          100% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes holoShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* 3D Card */}
      <div
        ref={cardRef}
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          width: 260,
          aspectRatio: '3/4',
          transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: isDragging ? 'none' : 'transform 0.4s ease',
          transformStyle: 'preserve-3d',
          animation: 'modalCardAppear 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onClick={e => e.stopPropagation()}
        onMouseMove={e => { setIsDragging(true); handleMove(e.clientX, e.clientY); }}
        onMouseLeave={() => { setIsDragging(false); setMouse({ x: 0.5, y: 0.5 }); }}
        onTouchMove={e => { setIsDragging(true); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={() => { setIsDragging(false); setMouse({ x: 0.5, y: 0.5 }); }}
      >
        <div
          className={`w-full h-full rounded-2xl overflow-hidden border-2 ${style.border}`}
          style={{
            boxShadow: [
              `0 0 30px ${isUR ? 'rgba(255,200,50,0.5)' : isSSRPlus ? 'rgba(168,85,247,0.4)' : 'rgba(0,0,0,0.3)'}`,
              `0 20px 60px rgba(0,0,0,0.5)`,
              `0 0 80px ${isUR ? 'rgba(255,180,0,0.3)' : 'transparent'}`,
            ].join(', '),
          }}
        >
          {/* Image */}
          {card.card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.card.imageUrl} alt={card.card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : card.card.character?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.card.character.avatarUrl} alt={card.card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-40`} />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Rarity badge */}
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-sm font-black bg-gradient-to-r ${style.bg} text-white shadow-lg z-10`}>
            {rarity}
          </div>

          {/* Name + info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <p className="text-white font-bold text-lg drop-shadow-lg">{card.card.name}</p>
            {card.card.character && <p className="text-purple-300 text-sm">{card.card.character.name}</p>}
          </div>

          {/* Hologram overlay */}
          {isHolo && (
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: `conic-gradient(from ${mouse.x * 360}deg at ${mouse.x * 100}% ${mouse.y * 100}%, #ff008060, #ff8c0060, #40e0d060, #0080ff60, #8800ff60, #ff008060)`,
                opacity: isDragging ? (isUR ? 0.5 : 0.35) : 0.12,
                mixBlendMode: 'color-dodge',
                transition: isDragging ? 'none' : 'opacity 0.5s ease',
              }}
            />
          )}

          {/* Mouse-follow light */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
              transition: isDragging ? 'none' : 'background 0.5s ease',
            }}
          />

          {/* Sparkles for SSR/UR */}
          {isSSRPlus && Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute z-30 pointer-events-none"
              style={{
                width: i % 3 === 0 ? 5 : 3,
                height: i % 3 === 0 ? 5 : 3,
                borderRadius: '50%',
                background: 'white',
                left: `${8 + i * 7.5}%`,
                top: `${10 + Math.sin(i * 1.5) * 35 + Math.cos(i * 0.7) * 15}%`,
                opacity: isDragging ? 0.9 : 0.3,
                boxShadow: isUR
                  ? '0 0 8px 3px rgba(255,200,50,0.9), 0 0 16px rgba(255,180,0,0.5)'
                  : '0 0 6px white, 0 0 12px rgba(255,255,255,0.5)',
                transform: `translate(${(mouse.x - 0.5) * 12}px, ${(mouse.y - 0.5) * 12}px)`,
                transition: isDragging ? 'transform 0.05s ease, opacity 0.15s ease' : 'all 0.5s ease',
                animation: `starTwinkle ${1.5 + i * 0.2}s ease-in-out infinite ${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Card info below */}
      <div className="mt-6 text-center max-w-[280px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-xl font-bold mb-1">{card.card.name}</h3>
        {card.card.character && <p className="text-purple-400 text-sm mb-2">{card.card.character.name}</p>}
        {card.card.description && <p className="text-white/50 text-sm mb-3 leading-relaxed">{card.card.description}</p>}
        <p className="text-white/25 text-xs mb-4">入手: {new Date(card.obtainedAt).toLocaleDateString('ja-JP')}</p>
        <button
          onClick={onClose}
          className="px-8 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-sm font-medium transition-colors border border-white/10"
        >
          閉じる
        </button>
      </div>
    </div>
  );
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
          <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0V21m10.5-18V21M3 8.25h18M3 15.75h18" />
            </svg>
          </div>
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
          <p className="text-white/30 text-xs text-right mt-0.5">{totalCards > 0 ? Math.round((cards.length / totalCards) * 100) : 0}% Complete</p>
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
          <div className="flex justify-center mb-4">
            <svg className="w-14 h-14 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0V21m10.5-18V21M3 8.25h18M3 15.75h18" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">最初のカードを手に入れよう</p>
          <p className="text-white/30 text-xs mt-1">ガチャを引いてコレクションを始めよう！</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((oc) => (
            <HoloCardThumbnail
              key={oc.userCardId}
              oc={oc}
              onClick={() => setSelectedCard(oc)}
            />
          ))}
        </div>
      )}

      {/* Card Detail Modal — Portal経由でbodyに直接レンダリング（transform親のcontaining block問題回避） */}
      {selectedCard && typeof document !== 'undefined' && createPortal(
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />,
        document.body
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

  // ── パック開封演出 ──────────────────────────────────────────
  const [openingPhase, setOpeningPhase] = useState<'idle' | 'pack' | 'reveal' | 'done'>('idle');
  const [showFlash, setShowFlash] = useState(false);
  const [visibleCards, setVisibleCards] = useState(0);
  const packTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // パックを開封するハンドラ（タップ or 2秒タイマー）
  const openPack = useCallback(() => {
    if (packTimerRef.current) clearTimeout(packTimerRef.current);
    const hasHighRarity = pullResults.some((c: PullResultCard) => ['SSR', 'UR'].includes(c.rarity));

    // SR以上ならパーティクル発火
    spawnParticles();

    // SSR以上ならフラッシュ演出
    if (hasHighRarity) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 600);
    }

    setOpeningPhase('reveal');
    const startDelay = hasHighRarity ? 420 : 0;

    // カードを1枚ずつ100ms遅延で表示
    pullResults.forEach((_: PullResultCard, i: number) => {
      setTimeout(() => {
        setVisibleCards(i + 1);
      }, startDelay + i * 100);
    });

    // 全カード表示後にdoneへ
    setTimeout(() => {
      setOpeningPhase('done');
    }, startDelay + pullResults.length * 100 + 300);
  }, [pullResults, spawnParticles]);

  // パック開封フェーズ: 2秒で自動開封
  useEffect(() => {
    if (openingPhase === 'pack') {
      packTimerRef.current = setTimeout(openPack, 2000);
    }
    return () => {
      if (packTimerRef.current) clearTimeout(packTimerRef.current);
    };
  }, [openingPhase, openPack]);

  const doPull = async (count: 1 | 10 | 'free') => {
    if (!selectedBanner || pulling) return;
    setPulling(true);
    setPullResults([]);
    setFlippedCards(new Set());
    setOpeningPhase('idle');
    setVisibleCards(0);
    setShowFlash(false);
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
      setOpeningPhase('pack'); // パック開封フェーズへ
      setCoinBalance(Number(data.coinBalance ?? data.remainingCoins) || coinBalance);
      // pityProgress from pull response
      const pp = data.pityProgress;
      if (pp && typeof pp === 'object') {
        const cur = Number(pp.current) || 0;
        const ceil = Number(pp.ceiling) || 100;
        setPityProgress(ceil > 0 ? (cur / ceil) * 100 : 0);
      }
      if (count === 'free') setFreeAvailable(false);
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
      {/* CSS keyframes for opening animations */}
      <style>{`
        @keyframes packShine {
          0%   { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
          10%  { opacity: 0.8; }
          90%  { opacity: 0.8; }
          100% { transform: translateX(320%) skewX(-20deg); opacity: 0; }
        }
        @keyframes packPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(168,85,247,0.6), 0 0 48px rgba(168,85,247,0.3); }
          50%       { box-shadow: 0 0 48px rgba(168,85,247,1),   0 0 96px rgba(236,72,153,0.6), 0 0 140px rgba(168,85,247,0.4); }
        }
        @keyframes cardDropIn {
          0%   { transform: translateY(-80px) scale(0.75); opacity: 0; }
          65%  { transform: translateY(6px)   scale(1.04); opacity: 1; }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        @keyframes flashFade {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes packFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-10px) rotate(1deg); }
        }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50" />

      {/* ── フラッシュ演出（SSR/UR時） — Portal経由 ── */}
      {showFlash && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'white',
            animation: 'flashFade 0.5s ease-out forwards',
            pointerEvents: 'none',
          }}
        />,
        document.body
      )}

      {/* ── パック開封フェーズ — Portal経由 ── */}
      {openingPhase === 'pack' && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.96)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={openPack}
        >
          {/* パックカード */}
          <div
            style={{
              width: 190, height: 252,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 35%, #ec4899 65%, #f59e0b 100%)',
              position: 'relative', overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.35)',
              animation: 'packPulse 1.6s ease-in-out infinite, packFloat 3s ease-in-out infinite',
            }}
          >
            {/* 光のライン */}
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0, width: 50,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
                animation: 'packShine 1.8s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            {/* 中央アイコン */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                border: '2px solid rgba(255,255,255,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(255,255,255,0.3)',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
            </div>
            {/* コーナーの星 */}
            {[{t:'8%',l:'8%'},{t:'8%',r:'8%'},{b:'8%',l:'8%'},{b:'8%',r:'8%'}].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', ...pos,
                width: 8, height: 8, borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 0 8px rgba(255,255,255,0.9)',
              }} />
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: 28, fontSize: 17, fontWeight: 'bold', letterSpacing: 1 }}>
            タップして開封
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 8, fontSize: 13 }}>
            2秒後に自動開封
          </p>
        </div>,
        document.body
      )}

      {/* ── カードリビールフェーズ — Portal経由 ── */}
      {openingPhase === 'reveal' && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 190,
            background: 'rgba(3,7,18,0.97)',
            padding: '24px 16px 80px',
            overflowY: 'auto',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 14, marginBottom: 16 }}>
            タップしてカードをめくろう！
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: pullResults.length > 1 ? 'repeat(5, 1fr)' : '1fr',
              gap: 8,
              maxWidth: pullResults.length === 1 ? 200 : 'none',
              margin: '0 auto',
            }}
          >
            {pullResults.slice(0, visibleCards).map((card: PullResultCard, i: number) => (
              <div
                key={`reveal-${card.id}-${i}`}
                style={{ animation: 'cardDropIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
              >
                <GachaFlipCard
                  rarity={card.rarity}
                  characterName={card.character?.name ?? '???'}
                  characterAvatarUrl={card.character?.avatarUrl ?? null}
                  itemName={card.name}
                  isFlipped={flippedCards.has(i)}
                  onFlip={() => setFlippedCards(prev => new Set(prev).add(i))}
                  isNew={card.isNew}
                  frameType={card.frameType}
                />
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Coin balance */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-3 py-1.5">
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
          </svg>
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

      {/* Pull Results — done フェーズのみ表示 */}
      {openingPhase === 'done' && pullResults.length > 0 && (
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
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 rounded-2xl py-4 font-black text-lg shadow-lg shadow-amber-500/30 active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pulling ? '...' : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                無料1回
              </>
            )}
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => doPull(1)}
            disabled={pulling || !selectedBanner}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl py-3.5 font-bold text-base shadow-lg shadow-purple-500/30 active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {pulling ? '...' : `1回 · ${selectedBanner?.costCoins ?? 100}コイン`}
          </button>
          <button
            onClick={() => doPull(10)}
            disabled={pulling || !selectedBanner}
            className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700 text-white rounded-2xl py-3.5 font-bold text-base shadow-lg shadow-purple-500/30 active:scale-[0.97] transition-transform disabled:opacity-50 border border-purple-400/30"
          >
            {pulling ? '...' : `10連 · ${selectedBanner?.cost10Coins ?? 900}コイン`}
          </button>
        </div>
      </div>

      {banners.length === 0 && (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <svg className="w-14 h-14 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">現在開催中のガチャはありません</p>
          <p className="text-white/30 text-xs mt-1">次回のバナーをお楽しみに</p>
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

  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // 水平スワイプ150px以上 & 垂直移動より水平移動が大きい場合のみタブ切替
    if (Math.abs(dx) > 150 && Math.abs(dx) > Math.abs(dy) * 2) {
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
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0V21m10.5-18V21M3 8.25h18M3 15.75h18" />
            </svg>
            カード
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
