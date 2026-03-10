'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound, vibrateGacha } from '@/lib/sound-effects';
import type { GachaRarity } from './GachaFlipCard';

// ---- Types ----
interface PackCard {
  rarity: string;
  card: {
    name: string;
    imageUrl: string | null;
    cardImageUrl: string | null;
    illustrationUrl: string | null;
    franchise: string | null;
    frameType: string | null;
    character?: { avatarUrl: string | null };
  };
  isNew: boolean;
}

interface GachaPackOpeningProps {
  cards: PackCard[];
  onComplete: () => void;  // 演出終了 → 結果画面へ
  onSkip: () => void;       // スキップ
}

// ---- レアリティ判定 ----
const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
const getRarityTier = (r: string) => RARITY_ORDER.indexOf(r);
const getBestRarity = (cards: PackCard[]): string =>
  cards.reduce((best, c) => getRarityTier(c.rarity) > getRarityTier(best) ? c.rarity : best, 'N');

// ---- レアリティ色 ----
const RARITY_COLORS: Record<string, { glow: string; text: string; bg: string }> = {
  N:   { glow: 'rgba(156,163,175,0.4)', text: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  R:   { glow: 'rgba(59,130,246,0.5)', text: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  SR:  { glow: 'rgba(168,85,247,0.6)', text: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
  SSR: { glow: 'rgba(245,158,11,0.7)', text: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
  UR:  { glow: 'rgba(244,114,182,0.8)', text: '#f472b6', bg: 'rgba(244,114,182,0.2)' },
};

// ---- フェーズ ----
type Phase = 'pack-appear' | 'pack-rip' | 'rarity-flash' | 'card-reveal' | 'done';

export function GachaPackOpening({ cards, onComplete, onSkip }: GachaPackOpeningProps) {
  const [phase, setPhase] = useState<Phase>('pack-appear');
  const [revealIndex, setRevealIndex] = useState(-1);
  const [showCard, setShowCard] = useState(false);
  const bestRarity = getBestRarity(cards);
  const bestColors = RARITY_COLORS[bestRarity] ?? RARITY_COLORS.N;
  const isSingle = cards.length === 1;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ---- フェーズ遷移 ----
  useEffect(() => {
    switch (phase) {
      case 'pack-appear':
        // パック登場 → 1秒後に切り裂き可能に
        timerRef.current = setTimeout(() => setPhase('pack-rip'), 1200);
        break;
      case 'rarity-flash':
        // レアリティ予兆フラッシュ → カード表示へ
        timerRef.current = setTimeout(() => {
          setRevealIndex(0);
          setPhase('card-reveal');
        }, getBestRarity(cards) === 'UR' ? 2000 : getBestRarity(cards) === 'SSR' ? 1500 : 800);
        break;
      case 'card-reveal':
        setShowCard(true);
        break;
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, cards]);

  // ---- パックを切る ----
  const ripPack = useCallback(() => {
    if (phase !== 'pack-rip') return;
    playSound('gacha_pull');
    vibrateGacha(bestRarity);
    setPhase('rarity-flash');
  }, [phase, bestRarity]);

  // ---- 次のカード ----
  const nextCard = useCallback(() => {
    if (phase !== 'card-reveal') return;
    const nextIdx = revealIndex + 1;
    if (nextIdx >= cards.length) {
      setPhase('done');
      setTimeout(onComplete, 600);
    } else {
      setShowCard(false);
      setTimeout(() => {
        setRevealIndex(nextIdx);
        const r = cards[nextIdx]?.rarity?.toLowerCase() || 'n';
        playSound(`gacha-reveal-${r}` as Parameters<typeof playSound>[0]);
        vibrateGacha(cards[nextIdx]?.rarity || 'N');
        setShowCard(true);
      }, 300);
    }
  }, [phase, revealIndex, cards, onComplete]);

  // 最初のカードのSE
  useEffect(() => {
    if (phase === 'card-reveal' && revealIndex === 0 && cards[0]) {
      const r = cards[0].rarity?.toLowerCase() || 'n';
      playSound(`gacha-reveal-${r}` as Parameters<typeof playSound>[0]);
    }
  }, [phase, revealIndex, cards]);

  const currentCard = cards[revealIndex];
  const currentColors = currentCard ? (RARITY_COLORS[currentCard.rarity] ?? RARITY_COLORS.N) : RARITY_COLORS.N;
  const currentImg = currentCard?.card.cardImageUrl ?? currentCard?.card.imageUrl ?? currentCard?.card.illustrationUrl ?? currentCard?.card.character?.avatarUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <style>{`
        @keyframes packFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes packShake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-4px) rotate(-1deg); }
          20% { transform: translateX(4px) rotate(1deg); }
          30% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          50% { transform: translateX(0); }
        }
        @keyframes ripTear {
          0% { clip-path: inset(0 0 0 0); opacity: 1; }
          50% { clip-path: inset(0 0 0 50%); opacity: 0.8; }
          100% { clip-path: inset(0 0 0 100%); opacity: 0; }
        }
        @keyframes ripTearLeft {
          0% { clip-path: inset(0 0 0 0); opacity: 1; }
          50% { clip-path: inset(0 50% 0 0); opacity: 0.8; }
          100% { clip-path: inset(0 100% 0 0); opacity: 0; }
        }
        @keyframes rarityBurst {
          0% { transform: scale(0); opacity: 1; }
          70% { transform: scale(2); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes rarityRays {
          0% { transform: rotate(0deg); opacity: 0.3; }
          100% { transform: rotate(360deg); opacity: 0.3; }
        }
        @keyframes cardSlideUp {
          0% { transform: translateY(80px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 20px var(--card-glow); }
          50% { box-shadow: 0 0 50px var(--card-glow), 0 0 80px var(--card-glow); }
        }
        @keyframes starBurst {
          0% { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes screenFlash {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes urRainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>

      {/* スキップボタン */}
      <button
        onClick={onSkip}
        className="absolute top-6 right-6 z-60 text-white/40 hover:text-white/80 text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        SKIP →
      </button>

      {/* 残りカード表示 */}
      {phase === 'card-reveal' && cards.length > 1 && (
        <div className="absolute top-6 left-6 z-60 text-white/50 text-sm font-bold"
          style={{ animation: 'fadeIn 0.3s ease' }}
        >
          {revealIndex + 1} / {cards.length}
        </div>
      )}

      {/* ===== Phase: pack-appear / pack-rip ===== */}
      {(phase === 'pack-appear' || phase === 'pack-rip') && (
        <div
          onClick={ripPack}
          className="relative cursor-pointer select-none"
          style={{
            animation: phase === 'pack-rip' ? 'packShake 0.5s ease infinite' : 'packFloat 2s ease-in-out infinite',
          }}
        >
          {/* パック本体 */}
          <div
            className="relative w-56 h-80 max-w-[70vw] max-h-[50vh] rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(160deg, ${bestColors.bg}, rgba(0,0,0,0.8))`,
              border: `2px solid ${bestColors.glow}`,
              boxShadow: `0 0 40px ${bestColors.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
            }}
          >
            {/* パック模様 */}
            <div className="absolute inset-0" style={{
              background: `
                repeating-linear-gradient(45deg, transparent, transparent 10px, ${bestColors.glow} 10px, ${bestColors.glow} 11px),
                repeating-linear-gradient(-45deg, transparent, transparent 10px, ${bestColors.glow} 10px, ${bestColors.glow} 11px)
              `,
              opacity: 0.08,
            }} />

            {/* 中央ロゴ */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3" style={{ filter: `drop-shadow(0 0 12px ${bestColors.glow})` }}>
                {isSingle ? '🎴' : '📦'}
              </div>
              <div className="text-white font-black text-lg tracking-wider" style={{ textShadow: `0 0 12px ${bestColors.glow}` }}>
                ANIVA
              </div>
              <div className="text-white/40 text-xs mt-1 tracking-widest">
                {isSingle ? 'SINGLE PACK' : '×10 PACK'}
              </div>
            </div>

            {/* 切り裂き線 */}
            {phase === 'pack-rip' && (
              <div className="absolute top-0 left-0 right-0 h-1" style={{
                background: `linear-gradient(90deg, transparent 20%, ${bestColors.text} 50%, transparent 80%)`,
                boxShadow: `0 0 8px ${bestColors.glow}`,
                animation: 'fadeIn 0.3s ease',
              }} />
            )}
          </div>

          {/* 指示テキスト */}
          <p className="text-center mt-6 text-sm font-medium" style={{
            color: phase === 'pack-rip' ? bestColors.text : 'rgba(255,255,255,0.3)',
            animation: 'fadeIn 0.5s ease',
          }}>
            {phase === 'pack-rip' ? 'タップで開封！' : ''}
          </p>
        </div>
      )}

      {/* ===== Phase: rarity-flash ===== */}
      {phase === 'rarity-flash' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* スクリーンフラッシュ */}
          <div className="absolute inset-0" style={{
            background: bestRarity === 'UR'
              ? 'radial-gradient(circle, rgba(244,114,182,0.9), rgba(168,85,247,0.6), transparent 70%)'
              : bestRarity === 'SSR'
              ? 'radial-gradient(circle, rgba(245,158,11,0.8), rgba(245,158,11,0.3), transparent 70%)'
              : bestRarity === 'SR'
              ? 'radial-gradient(circle, rgba(168,85,247,0.6), transparent 60%)'
              : 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 50%)',
            animation: 'screenFlash 1.5s ease-out forwards',
          }} />

          {/* URレインボーリング */}
          {bestRarity === 'UR' && (
            <div className="absolute w-96 h-96 rounded-full" style={{
              background: 'conic-gradient(#ff0080, #ff8c00, #ffd700, #40e0d0, #0080ff, #8800ff, #ff0080)',
              opacity: 0.4,
              animation: 'urRainbow 2s linear infinite, rarityBurst 2s ease-out forwards',
              filter: 'blur(20px)',
            }} />
          )}

          {/* SSR金バースト */}
          {bestRarity === 'SSR' && (
            <div className="absolute w-72 h-72 rounded-full" style={{
              background: 'radial-gradient(circle, rgba(250,204,21,0.8), transparent 70%)',
              animation: 'rarityBurst 1.5s ease-out forwards',
            }} />
          )}

          {/* 放射線 */}
          {(bestRarity === 'SSR' || bestRarity === 'UR') && (
            <div className="absolute w-[600px] h-[600px]" style={{
              background: `conic-gradient(from 0deg, transparent, ${bestColors.glow}, transparent, ${bestColors.glow}, transparent, ${bestColors.glow}, transparent, ${bestColors.glow}, transparent)`,
              animation: 'rarityRays 4s linear infinite',
              filter: 'blur(2px)',
            }} />
          )}

          {/* レアリティ文字 */}
          {getRarityTier(bestRarity) >= 2 && (
            <div
              className="text-6xl font-black tracking-[0.3em]"
              style={{
                color: bestColors.text,
                textShadow: `0 0 30px ${bestColors.glow}, 0 0 60px ${bestColors.glow}`,
                animation: 'cardSlideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              {bestRarity === 'UR' ? '✦ UR ✦' : bestRarity === 'SSR' ? '★ SSR ★' : '✧ SR ✧'}
            </div>
          )}
        </div>
      )}

      {/* ===== Phase: card-reveal (1枚ずつ開封) ===== */}
      {phase === 'card-reveal' && currentCard && (
        <div
          className="flex flex-col items-center cursor-pointer select-none"
          onClick={nextCard}
          style={{ animation: showCard ? 'cardSlideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none' }}
        >
          {/* カード本体 */}
          <div
            className="relative w-64 max-w-[75vw] rounded-2xl overflow-hidden"
            style={{
              aspectRatio: '3/4',
              border: `2px solid ${currentColors.text}`,
              boxShadow: `0 0 30px ${currentColors.glow}, 0 0 60px ${currentColors.glow}`,
              animation: getRarityTier(currentCard.rarity) >= 3 ? 'cardGlow 2s ease-in-out infinite' : 'none',
              ['--card-glow' as string]: currentColors.glow,
              opacity: showCard ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            {/* カード画像 */}
            {currentImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImg}
                alt={currentCard.card.name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-6xl">🃏</div>
            )}

            {/* ホログラムオーバーレイ */}
            {getRarityTier(currentCard.rarity) >= 2 && (
              <div className="absolute inset-0" style={{
                background: `conic-gradient(from ${Date.now() % 360}deg, #ff008040, #ff8c0040, #40e0d040, #0080ff40, #8800ff40, #ff008040)`,
                mixBlendMode: 'screen',
                opacity: 0.4,
              }} />
            )}

            {/* レアリティバッジ */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black" style={{
              background: currentColors.bg,
              color: currentColors.text,
              border: `1px solid ${currentColors.glow}`,
              backdropFilter: 'blur(8px)',
              boxShadow: `0 0 12px ${currentColors.glow}`,
            }}>
              {currentCard.rarity}
            </div>

            {/* NEWバッジ */}
            {currentCard.isNew && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-black"
                style={{ background: 'rgba(16,185,129,0.9)', color: 'white' }}
              >
                ✨ NEW
              </div>
            )}

            {/* カード名 */}
            <div className="absolute bottom-0 left-0 right-0 p-4" style={{
              background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            }}>
              <p className="text-white font-bold text-lg leading-tight">{currentCard.card.name}</p>
              {currentCard.card.franchise && (
                <p className="text-white/50 text-xs mt-0.5">{currentCard.card.franchise}</p>
              )}
            </div>
          </div>

          {/* タップで次へ */}
          <p className="mt-6 text-white/30 text-sm animate-pulse">
            {revealIndex < cards.length - 1 ? 'タップで次のカード' : 'タップで結果へ'}
          </p>
        </div>
      )}
    </div>
  );
}
