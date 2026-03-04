'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, playGachaRevealSound } from '@/lib/sound-effects';

// ---- Types ----
interface Banner {
  id: string;
  name: string;
  description: string | null;
  characterId: string | null;
  rateUp: Record<string, number>;
  costCoins: number;
  cost10Coins: number | null;
  guaranteedSrAt: number | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  franchise: string | null;
  bannerImageUrl: string | null;
  themeColor: string | null;
  animationType: string | null;
  preRollConfig: Record<string, unknown> | null;
}

interface CardResult {
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    cardImageUrl: string | null;
    illustrationUrl: string | null;
    frameType: string | null;
    rarity: string;
    characterId: string;
    characterSlug?: string | null;
    franchise: string | null;
  };
  isNew: boolean;
  rarity: string;
}

type View = 'banners' | 'gacha' | 'animating' | 'results';

// ---- Constants ----
const RARITY_ORDER: Record<string, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  N:   { bg: 'bg-gray-700',    border: 'border-gray-500',   text: 'text-gray-300',   label: 'NORMAL'     },
  R:   { bg: 'bg-blue-900',    border: 'border-blue-500',   text: 'text-blue-300',   label: 'RARE'       },
  SR:  { bg: 'bg-purple-900',  border: 'border-purple-400', text: 'text-purple-200', label: 'S·RARE'     },
  SSR: { bg: 'bg-yellow-900',  border: 'border-yellow-400', text: 'text-yellow-200', label: 'S·S·RARE'   },
  UR:  { bg: 'bg-gradient-to-br from-pink-900 via-purple-900 to-blue-900', border: 'border-pink-400', text: 'text-pink-200', label: 'ULTRA RARE' },
};

// Static particle positions (avoids hydration mismatch)
const SSR_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 4.17 + 2) % 100}%`,
  delay: `${(i * 0.09) % 1.2}s`,
  duration: `${1.2 + (i * 0.11) % 0.8}s`,
  size: `${8 + (i * 4) % 16}px`,
  opacity: 0.6 + (i * 0.02) % 0.4,
}));

const UR_RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30,
  delay: `${i * 0.08}s`,
}));

// ---- Screen Crack SVG Overlay ----
function ScreenCrack({ rarity }: { rarity: string }) {
  const crackColor =
    rarity === 'UR'
      ? 'rgba(255,200,255,0.9)'
      : rarity === 'SSR'
      ? 'rgba(255,235,100,0.9)'
      : 'rgba(200,160,255,0.9)';

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes crackIn {
          0%   { opacity: 0; clip-path: polygon(50% 50%, 50% 50%, 50% 50%); }
          20%  { opacity: 1; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }
          60%  { opacity: 1; clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
          100% { opacity: 0; clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
        }
        @keyframes crackLine1 {
          0%   { stroke-dashoffset: 300; opacity: 0; }
          20%  { opacity: 1; }
          70%  { stroke-dashoffset: 0; opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes crackLine2 {
          0%,15%  { stroke-dashoffset: 250; opacity: 0; }
          35%  { opacity: 1; }
          75%  { stroke-dashoffset: 0; opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes crackLine3 {
          0%,25%  { stroke-dashoffset: 200; opacity: 0; }
          50%  { opacity: 1; }
          85%  { stroke-dashoffset: 0; opacity: 1; }
          100% { opacity: 0; }
        }
        .crack-svg { animation: crackIn 1.2s ease-out forwards; }
        .crack-l1  { stroke-dasharray: 300; animation: crackLine1 1.2s ease-out forwards; }
        .crack-l2  { stroke-dasharray: 250; animation: crackLine2 1.2s ease-out forwards; }
        .crack-l3  { stroke-dasharray: 200; animation: crackLine3 1.2s ease-out forwards; }
      `}</style>
      <svg
        className="crack-svg absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Main crack lines radiating from center */}
        <polyline
          className="crack-l1"
          points="200,400 180,250 140,100 100,0"
          fill="none"
          stroke={crackColor}
          strokeWidth="3"
          filter="url(#glow)"
        />
        <polyline
          className="crack-l1"
          points="200,400 230,320 300,200 380,80"
          fill="none"
          stroke={crackColor}
          strokeWidth="2.5"
          filter="url(#glow)"
        />
        <polyline
          className="crack-l2"
          points="200,400 160,480 80,620 20,800"
          fill="none"
          stroke={crackColor}
          strokeWidth="2.5"
          filter="url(#glow)"
        />
        <polyline
          className="crack-l2"
          points="200,400 260,450 350,560 400,700"
          fill="none"
          stroke={crackColor}
          strokeWidth="2"
          filter="url(#glow)"
        />
        <polyline
          className="crack-l3"
          points="200,400 120,380 0,360"
          fill="none"
          stroke={crackColor}
          strokeWidth="2"
          filter="url(#glow)"
        />
        <polyline
          className="crack-l3"
          points="200,400 320,390 400,400"
          fill="none"
          stroke={crackColor}
          strokeWidth="1.5"
          filter="url(#glow)"
        />
        {/* Sub-cracks */}
        <polyline
          className="crack-l3"
          points="180,250 150,230 120,240"
          fill="none"
          stroke={crackColor}
          strokeWidth="1.5"
          filter="url(#glow)"
        />
        <polyline
          className="crack-l3"
          points="230,320 260,300 280,310"
          fill="none"
          stroke={crackColor}
          strokeWidth="1.5"
          filter="url(#glow)"
        />
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

// ---- Cinematic Overlay Component ----
function CinematicOverlay({
  rarity,
  themeColor,
  onComplete,
}: {
  rarity: string;
  themeColor: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [showCrack, setShowCrack] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSkip = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    setSkipped(true);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timersRef.current = timers;

    if (rarity === 'SR') {
      // 1.8s total: pillar → crack → card
      timers.push(setTimeout(() => setPhase(1), 300));
      timers.push(setTimeout(() => setShowCrack(true), 700));
      timers.push(setTimeout(onComplete, 1800));
    } else if (rarity === 'SSR') {
      // 2.5s: gold particles → crack → card
      timers.push(setTimeout(() => setPhase(1), 400));
      timers.push(setTimeout(() => setShowCrack(true), 900));
      timers.push(setTimeout(onComplete, 2500));
    } else if (rarity === 'UR') {
      // 3s: flood → burst → rainbow → crack → card
      timers.push(setTimeout(() => setPhase(1), 600));
      timers.push(setTimeout(() => setPhase(2), 1100));
      timers.push(setTimeout(() => setPhase(3), 1600));
      timers.push(setTimeout(() => setShowCrack(true), 1800));
      timers.push(setTimeout(() => setPhase(4), 2400));
      timers.push(setTimeout(onComplete, 3000));
    } else {
      // N/R: quick flash 0.5s
      timers.push(setTimeout(onComplete, 500));
    }

    return () => timers.forEach(clearTimeout);
  }, [rarity, onComplete]);

  // N/R: just a quick blue flash
  if (rarity === 'N' || rarity === 'R') {
    return (
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.3) 0%, transparent 70%)',
          animation: 'fadeOut 0.5s ease-out forwards',
        }}
      />
    );
  }

  // SR: purple pillar of light
  if (rarity === 'SR') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80">
        <style>{`
          @keyframes srPillarIn {
            0% { transform: scaleY(0) scaleX(0.3); opacity: 0; }
            40% { transform: scaleY(1) scaleX(1); opacity: 1; }
            80% { transform: scaleY(1) scaleX(1.2); opacity: 0.9; }
            100% { transform: scaleY(1.1) scaleX(1.5); opacity: 0; }
          }
          @keyframes srGlow {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
          }
          @keyframes srTextIn {
            0% { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        {/* Background ambient glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.4) 0%, rgba(88,28,220,0.2) 40%, transparent 70%)',
            animation: 'srGlow 1.5s ease-in-out',
          }}
        />
        {/* Light pillar */}
        {phase >= 1 && (
          <div
            className="absolute"
            style={{
              width: '8px',
              height: '100vh',
              background: 'linear-gradient(to bottom, transparent, rgba(196,132,252,0.9) 30%, white 50%, rgba(196,132,252,0.9) 70%, transparent)',
              boxShadow: '0 0 40px 20px rgba(168,85,247,0.7), 0 0 80px 40px rgba(139,92,246,0.4)',
              animation: 'srPillarIn 1.2s ease-out forwards',
              transformOrigin: 'center center',
            }}
          />
        )}
        {/* SR text */}
        {phase >= 1 && (
          <div
            className="absolute text-center"
            style={{ animation: 'srTextIn 0.4s ease-out 0.5s both' }}
          >
            <div className="text-5xl font-black text-purple-200 tracking-widest drop-shadow-lg">
              S·RARE
            </div>
          </div>
        )}
        {/* Horizontal flares */}
        {phase >= 1 && (
          <>
            <div
              className="absolute"
              style={{
                width: '60vw',
                height: '2px',
                background: 'linear-gradient(to right, transparent, rgba(196,132,252,0.8), transparent)',
                boxShadow: '0 0 20px 4px rgba(168,85,247,0.6)',
                animation: 'srPillarIn 1s ease-out 0.3s forwards',
                transformOrigin: 'center center',
              }}
            />
          </>
        )}
        {/* Screen crack */}
        {showCrack && <ScreenCrack rarity={rarity} />}
        {/* Skip button */}
        {!skipped && (
          <button
            onClick={handleSkip}
            className="absolute bottom-8 right-6 z-[70] text-sm text-white/50 hover:text-white/90 transition-colors bg-black/30 px-3 py-1.5 rounded-lg border border-white/10"
          >
            スキップ →
          </button>
        )}
      </div>
    );
  }

  // SSR: golden particles
  if (rarity === 'SSR') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90">
        <style>{`
          @keyframes ssrParticleRise {
            0% { transform: translateY(100vh) scale(0) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 0.8; }
            100% { transform: translateY(-30vh) scale(1.2) rotate(360deg); opacity: 0; }
          }
          @keyframes ssrBgPulse {
            0% { opacity: 0; }
            30% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes ssrTitleIn {
            0% { opacity: 0; transform: translateY(20px) scale(0.8); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes ssrShine {
            0%, 100% { text-shadow: 0 0 20px rgba(250,204,21,0.8); }
            50% { text-shadow: 0 0 40px rgba(250,204,21,1), 0 0 80px rgba(250,204,21,0.6); }
          }
        `}</style>
        {/* Background glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(161,108,15,0.5) 0%, rgba(92,52,3,0.3) 50%, transparent 80%)',
            animation: 'ssrBgPulse 2.5s ease-in-out',
          }}
        />
        {/* Particles */}
        {phase >= 1 && SSR_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: p.left,
              bottom: '-20px',
              width: p.size,
              height: p.size,
              background: i % 3 === 0
                ? 'radial-gradient(circle, #fde68a, #f59e0b)'
                : i % 3 === 1
                  ? 'radial-gradient(circle, #ffffff, #fcd34d)'
                  : 'radial-gradient(circle, #fbbf24, #d97706)',
              borderRadius: i % 5 === 0 ? '0' : '50%',
              boxShadow: `0 0 ${parseInt(p.size) * 1.5}px rgba(251,191,36,0.8)`,
              opacity: p.opacity,
              animation: `ssrParticleRise ${p.duration} ${p.delay} ease-out forwards`,
            }}
          />
        ))}
        {/* Title */}
        {phase >= 1 && (
          <div
            className="absolute text-center z-10"
            style={{ animation: 'ssrTitleIn 0.6s ease-out 0.6s both' }}
          >
            <div
              className="text-6xl font-black tracking-widest"
              style={{
                color: '#fde68a',
                animation: 'ssrShine 1s ease-in-out 0.8s infinite',
              }}
            >
              S·S·RARE
            </div>
            <div className="text-yellow-400 text-sm mt-2 font-medium tracking-widest">
              ✦ ULTRA PULL ✦
            </div>
          </div>
        )}
        {/* Screen crack */}
        {showCrack && <ScreenCrack rarity={rarity} />}
        {/* Skip button */}
        {!skipped && (
          <button
            onClick={handleSkip}
            className="absolute bottom-8 right-6 z-[70] text-sm text-white/50 hover:text-white/90 transition-colors bg-black/30 px-3 py-1.5 rounded-lg border border-white/10"
          >
            スキップ →
          </button>
        )}
      </div>
    );
  }

  // UR: multi-phase full screen
  if (rarity === 'UR') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <style>{`
          @keyframes urFloodIn {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes urBurst {
            0% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.5); }
            100% { opacity: 0; transform: scale(3); }
          }
          @keyframes urRainbowSweep {
            0% { opacity: 0; transform: translateX(-100%); }
            30% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; transform: translateX(100%); }
          }
          @keyframes urRayRotate {
            0% { opacity: 0; transform: rotate(var(--ray-angle)) scaleY(0); }
            30% { opacity: 1; transform: rotate(var(--ray-angle)) scaleY(1); }
            70% { opacity: 1; }
            100% { opacity: 0; transform: rotate(calc(var(--ray-angle) + 30deg)) scaleY(1.2); }
          }
          @keyframes urTitleIn {
            0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
            60% { transform: scale(1.1) rotate(2deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes urTitleShine {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 20px currentColor); }
            50% { filter: brightness(1.5) drop-shadow(0 0 40px currentColor) drop-shadow(0 0 80px currentColor); }
          }
          @keyframes urParticleFloat {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
          }
          @keyframes fadeOut { to { opacity: 0; } }
        `}</style>

        {/* Phase 0-1: Theme color flood */}
        {phase <= 1 && (
          <div
            className="absolute inset-0"
            style={{
              background: phase === 0
                ? `radial-gradient(ellipse at center, ${themeColor} 0%, ${themeColor}88 40%, ${themeColor}22 80%, transparent 100%)`
                : `radial-gradient(ellipse at center, ${themeColor} 0%, ${themeColor} 60%, ${themeColor}88 100%)`,
              animation: 'urFloodIn 0.8s ease-out forwards',
            }}
          />
        )}

        {/* Phase 2: White burst */}
        {phase === 2 && (
          <div
            className="absolute inset-0 bg-white"
            style={{ animation: 'urBurst 0.6s ease-out forwards' }}
          />
        )}

        {/* Phase 3: Rainbow sweep + rays */}
        {phase >= 3 && phase < 4 && (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #ff0000 0%, #ff7700 16%, #ffff00 33%, #00ff00 50%, #0077ff 66%, #8800ff 83%, #ff00ff 100%)',
                animation: 'urRainbowSweep 1s ease-in-out forwards',
              }}
            />
            {UR_RAYS.map((ray, i) => (
              <div
                key={i}
                className="absolute"
                style={
                  {
                    '--ray-angle': `${ray.angle}deg`,
                    width: '4px',
                    height: '150vh',
                    top: '50%',
                    left: '50%',
                    marginLeft: '-2px',
                    marginTop: '-75vh',
                    background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.9), transparent)',
                    transformOrigin: 'center 75vh',
                    transform: `rotate(${ray.angle}deg)`,
                    animation: `urRayRotate 1s ${ray.delay} ease-out forwards`,
                  } as React.CSSProperties
                }
              />
            ))}
          </>
        )}

        {/* Phase 4: Fade out */}
        {phase >= 4 && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, ${themeColor}33 0%, transparent 70%)`,
              animation: 'fadeOut 0.5s ease-out forwards',
            }}
          />
        )}

        {/* UR title (phases 1-4) */}
        {phase >= 1 && (
          <div
            className="absolute text-center z-20"
            style={{ animation: 'urTitleIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <div
              className="font-black tracking-widest"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                background: 'linear-gradient(135deg, #fde68a, #f59e0b, #ef4444, #ec4899, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'urTitleShine 1s ease-in-out 0.3s infinite',
              }}
            >
              ULTRA RARE
            </div>
            <div className="text-white text-xs mt-2 tracking-[0.4em] opacity-90">
              ✦ ✦ ✦  LEGENDARY  ✦ ✦ ✦
            </div>
          </div>
        )}
        {/* Screen crack */}
        {showCrack && <ScreenCrack rarity={rarity} />}
        {/* Skip button */}
        {!skipped && (
          <button
            onClick={handleSkip}
            className="absolute bottom-8 right-6 z-[70] text-sm text-white/50 hover:text-white/90 transition-colors bg-black/30 px-3 py-1.5 rounded-lg border border-white/10"
          >
            スキップ →
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ---- Flip Card Component ----
function FlipCard({
  result,
  index,
  isRevealed,
  onReveal,
}: {
  result: CardResult;
  index: number;
  isRevealed: boolean;
  onReveal: (index: number) => void;
}) {
  const style = RARITY_STYLES[result.rarity] ?? RARITY_STYLES.N;
  const isHighRarity = result.rarity === 'SSR' || result.rarity === 'UR';
  const displayImageUrl =
    result.card.cardImageUrl ??
    result.card.imageUrl ??
    (result.card.characterSlug ? `/characters/${result.card.characterSlug}/avatar.webp` : null) ??
    (result.card.characterSlug ? `/characters/${result.card.characterSlug}/avatar.jpg` : null);

  // Frame border style
  const frameStyle: React.CSSProperties = (() => {
    if (result.card.frameType === 'gold') return { borderColor: '#f59e0b', borderWidth: '3px' };
    if (result.card.frameType === 'rainbow') return {
      borderImage: 'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8800ff) 1',
      borderWidth: '3px',
      borderStyle: 'solid',
    };
    return {};
  })();

  return (
    <>
      <style>{`
        .card-scene { perspective: 800px; }
        .card-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
          transform-style: preserve-3d;
        }
        .card-inner.flipped { transform: rotateY(180deg); }
        .card-face {
          position: absolute; width: 100%; height: 100%;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          border-radius: 12px; overflow: hidden;
        }
        .card-back {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
          display: flex; align-items: center; justify-content: center;
          border: 2px solid rgba(99,102,241,0.5); cursor: pointer;
        }
        .card-front { transform: rotateY(180deg); }
        @keyframes cardGlowGold {
          0%,100% { box-shadow: 0 0 20px rgba(250,204,21,0.5); }
          50% { box-shadow: 0 0 50px rgba(250,204,21,0.9), 0 0 100px rgba(250,204,21,0.4); }
        }
        @keyframes cardGlowUR {
          0%,100% { box-shadow: 0 0 30px rgba(244,114,182,0.6); }
          33% { box-shadow: 0 0 60px rgba(168,85,247,0.9), 0 0 120px rgba(168,85,247,0.5); }
          66% { box-shadow: 0 0 60px rgba(59,130,246,0.9), 0 0 120px rgba(59,130,246,0.5); }
        }
        .ssr-glow { animation: cardGlowGold 1.5s ease-in-out infinite; }
        .ur-glow  { animation: cardGlowUR 2s ease-in-out infinite; }
        @keyframes shimmerSwipe {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmerSwipe 1.5s ease-in-out infinite;
        }
        @keyframes newSparkle {
          0%,100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.3) rotate(10deg); }
          75% { transform: scale(0.9) rotate(-5deg); }
        }
        .new-badge { animation: newSparkle 1.2s ease-in-out infinite; }
        @keyframes backShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .back-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: backShimmer 2s ease-in-out infinite;
        }
      `}</style>
      <div className="card-scene" style={{ height: '200px' }}>
        <div className={`card-inner ${isRevealed ? 'flipped' : ''}`}>
          {/* Back (unrevealed) */}
          <div
            className="card-face card-back"
            onClick={() => !isRevealed && onReveal(index)}
          >
            <div className="relative flex flex-col items-center gap-2 select-none z-10">
              <span className="text-4xl">🃏</span>
              <span className="text-xs text-indigo-300 font-medium">タップでめくる</span>
            </div>
            <div className="back-shimmer absolute inset-0 rounded-xl pointer-events-none" />
          </div>
          {/* Front (revealed) */}
          <div className="card-face card-front">
            <div
              className={`relative w-full h-full border-2 p-3 flex flex-col ${style.bg} ${style.border} ${
                isRevealed && result.rarity === 'SSR' ? 'ssr-glow' : ''
              } ${
                isRevealed && result.rarity === 'UR' ? 'ur-glow' : ''
              }`}
              style={{ borderRadius: '12px', ...frameStyle }}
            >
              {result.isNew && (
                <div className="new-badge absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold z-10">
                  ✨ NEW
                </div>
              )}
              {isHighRarity && isRevealed && (
                <div className="shimmer-bg absolute inset-0 pointer-events-none rounded-xl z-0" />
              )}
              {displayImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImageUrl}
                  alt={result.card.name}
                  className="w-full flex-1 object-cover rounded-lg mb-2 min-h-0 relative z-10"
                />
              ) : (
                <div className="w-full flex-1 rounded-lg mb-2 flex items-center justify-center bg-black/30 text-4xl min-h-0 relative z-10">
                  🃏
                </div>
              )}
              <div className={`text-xs font-bold mb-0.5 relative z-10 ${style.text}`}>
                {style.label}
              </div>
              <div className="text-sm font-semibold truncate text-white relative z-10">
                {result.card.name}
              </div>
              {result.card.franchise && (
                <div className="text-xs text-gray-300 truncate relative z-10">{result.card.franchise}</div>
              )}
              {!result.isNew && (
                <div className="text-xs text-gray-400 mt-0.5 relative z-10">所持済み</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Banner Card Component ----
function BannerCard({
  banner,
  onSelect,
}: {
  banner: Banner;
  onSelect: (banner: Banner) => void;
}) {
  const theme = banner.themeColor ?? '#6d28d9';
  const cost10 = banner.cost10Coins ?? banner.costCoins * 10;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shrink-0 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ width: '280px', minHeight: '180px' }}
      onClick={() => onSelect(banner)}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: banner.bannerImageUrl
            ? `linear-gradient(to bottom, ${theme}44 0%, ${theme}cc 100%), url(${banner.bannerImageUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${theme} 0%, ${theme}88 50%, ${theme}44 100%)`,
        }}
      />
      {/* Overlay pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)`,
          backgroundSize: '8px 8px',
        }}
      />
      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col h-full" style={{ minHeight: '180px' }}>
        {banner.franchise && (
          <div
            className="text-xs font-bold tracking-widest mb-1 uppercase opacity-80"
            style={{ color: '#fff' }}
          >
            {banner.franchise}
          </div>
        )}
        <div className="text-xl font-black text-white drop-shadow mb-1 leading-tight">
          {banner.name}
        </div>
        {banner.description && (
          <div className="text-white/70 text-xs mb-3 line-clamp-2">{banner.description}</div>
        )}
        {/* FOMAカウントダウン */}
        {banner.endAt && (() => {
          const diffMs = new Date(banner.endAt).getTime() - Date.now();
          const diffDays = Math.floor(diffMs / 86400000);
          const diffH = Math.floor((diffMs % 86400000) / 3600000);
          if (diffMs <= 0) return null;
          if (diffDays <= 3) return (
            <div className="flex items-center gap-1.5 text-xs bg-red-900/50 border border-red-500/40 rounded-xl px-3 py-1.5 mb-3 animate-pulse">
              <span>⏰</span>
              <span className="text-red-300 font-bold">
                {diffDays > 0 ? `残り${diffDays}日${diffH}時間` : `残り${diffH}時間`}で終了！
              </span>
            </div>
          );
          return (
            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-2">
              <span>📅</span>
              <span>残り{diffDays}日</span>
            </div>
          );
        })()}
        <div className="mt-auto flex items-end justify-between">
          <div>
            <div className="text-white/60 text-xs">1回: {banner.costCoins}コイン</div>
            <div className="text-white font-bold text-sm">10連: {cost10}コイン</div>
            {banner.guaranteedSrAt && (
              <div className="text-white/60 text-xs mt-0.5">SR天井: {banner.guaranteedSrAt}連</div>
            )}
          </div>
          <button
            className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:brightness-110"
            style={{ background: theme, border: '2px solid rgba(255,255,255,0.3)' }}
            onClick={(e) => { e.stopPropagation(); onSelect(banner); }}
          >
            このガチャを引く →
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function GachaPage() {
  const [view, setView] = useState<View>('banners');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [myCardCount, setMyCardCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [freeGachaAvailable, setFreeGachaAvailable] = useState(false);
  const [pityCount, setPityCount] = useState(0);
  const [results, setResults] = useState<CardResult[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animRarity, setAnimRarity] = useState('N');

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

  function selectBanner(banner: Banner) {
    setSelectedBanner(banner);
    setView('gacha');
    setError(null);
  }

  const handleReveal = useCallback((index: number) => {
    setRevealedSet((prev) => new Set([...prev, index]));
    if (results[index]) playGachaRevealSound(results[index].rarity);
  }, [results]);

  const handleRevealAll = useCallback(async () => {
    for (let i = 0; i < results.length; i++) {
      await new Promise<void>((r) => setTimeout(r, 120));
      setRevealedSet((prev) => new Set([...prev, i]));
      if (results[i]) playGachaRevealSound(results[i].rarity);
    }
  }, [results]);

  function getHighestRarity(pulls: CardResult[]): string {
    let highest = 'N';
    for (const r of pulls) {
      if ((RARITY_ORDER[r.rarity] ?? 0) > (RARITY_ORDER[highest] ?? 0)) {
        highest = r.rarity;
      }
    }
    return highest;
  }

  async function pull(count: 1 | 10) {
    if (!selectedBanner || isPulling) return;
    playSound('gacha_pull');
    setIsPulling(true);
    setError(null);

    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId: selectedBanner.id, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
        setIsPulling(false);
        return;
      }
      const pullResults: CardResult[] = data.results ?? [];
      setResults(pullResults);
      setCoinBalance(data.coinBalance ?? 0);
      setRevealedSet(new Set());

      // Update pity counter
      const hasHighRarity = pullResults.some(r => r.rarity === 'SR' || r.rarity === 'SSR' || r.rarity === 'UR');
      setPityCount(prev => hasHighRarity ? 0 : prev + count);

      // Determine animation rarity
      const topRarity = getHighestRarity(pullResults);
      setAnimRarity(topRarity);

      // Mission tracking
      if (!sessionStorage.getItem('mission_triggered_gacha_pull')) {
        sessionStorage.setItem('mission_triggered_gacha_pull', '1');
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId: 'gacha_pull' }),
        }).catch(() => {/* ignore */});
      }

      // Show cinematic animation
      setView('animating');
    } catch {
      setError('通信エラーが発生しました');
      setIsPulling(false);
    }
  }

  async function pullFree() {
    if (!selectedBanner || isPulling) return;
    setIsPulling(true);
    setError(null);

    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId: selectedBanner.id, count: 1, free: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
        setIsPulling(false);
        return;
      }
      const pullResults: CardResult[] = data.results ?? [];
      setResults(pullResults);
      setCoinBalance(data.coinBalance ?? 0);
      setRevealedSet(new Set());
      setFreeGachaAvailable(false); // consumed

      const topRarity = getHighestRarity(pullResults);
      setAnimRarity(topRarity);
      setView('animating');
    } catch {
      setError('通信エラーが発生しました');
      setIsPulling(false);
    }
  }

  function onAnimationComplete() {
    setIsPulling(false);
    setView('results');
    playSound('gacha_pull');
    // Auto-reveal for single pull or N/R
    if (results.length === 1 || animRarity === 'N' || animRarity === 'R') {
      setTimeout(() => {
        setRevealedSet(new Set(results.map((_, i) => i)));
        // 単発: 即座にレアリティ音
        if (results.length === 1) {
          playGachaRevealSound(results[0].rarity);
        }
      }, 300);
    }
  }

  function closeResults() {
    setResults([]);
    setRevealedSet(new Set());
    setView('gacha');
  }

  const allRevealed = results.length > 0 && revealedSet.size >= results.length;
  const newCount = results.filter((r, i) => revealedSet.has(i) && r.isNew).length;
  const themeColor = selectedBanner?.themeColor ?? '#6d28d9';
  const guaranteedSrAt = selectedBanner?.guaranteedSrAt ?? 100;
  const remainingToCeiling = Math.max(0, guaranteedSrAt - pityCount);

  return (
    <>
      <style>{`
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes bannerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes coinPop {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes bgPulse {
          0%,100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }
        .pulling-anim { animation: coinPop 0.3s ease-out; }
      `}</style>

      <div className="min-h-screen bg-gray-950 text-white pb-24">

        {/* ===== CINEMATIC ANIMATION OVERLAY ===== */}
        {view === 'animating' && (
          <CinematicOverlay
            rarity={animRarity}
            themeColor={themeColor}
            onComplete={onAnimationComplete}
          />
        )}

        {/* ===== BANNER SELECT VIEW ===== */}
        <AnimatePresence>
          {view === 'banners' && (
            <motion.div
              key="banners"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -40 }}
              className="min-h-screen p-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pt-2">
                <div>
                  <h1 className="text-2xl font-black">🎴 ガチャ</h1>
                  <p className="text-gray-500 text-xs mt-0.5">バナーを選んで引こう</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">所持: {myCardCount}枚</span>
                  <div className="flex items-center gap-1.5 bg-yellow-900/40 px-3 py-1.5 rounded-full border border-yellow-600/30">
                    <span className="text-yellow-400 text-sm">🪙</span>
                    <span className="font-bold text-yellow-300 text-sm">{coinBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {banners.length === 0 ? (
                <div className="text-center text-gray-500 py-24">
                  <div className="text-5xl mb-4">🎴</div>
                  <p>現在開催中のガチャはありません</p>
                </div>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    開催中のガチャ
                  </h2>
                  {/* Horizontal scroll banner list */}
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }}>
                    {banners.map((banner) => (
                      <div key={banner.id} style={{ scrollSnapAlign: 'start' }}>
                        <BannerCard banner={banner} onSelect={selectBanner} />
                      </div>
                    ))}
                  </div>

                  {freeGachaAvailable && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-center text-sm text-green-400 bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-3"
                    >
                      🎁 本日の無料ガチャが利用可能です！バナーを選んで引いてみよう
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== GACHA PULL VIEW ===== */}
        <AnimatePresence>
          {view === 'gacha' && selectedBanner && (
            <motion.div
              key="gacha"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="min-h-screen relative"
            >
              {/* Theme background */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at top, ${themeColor}33 0%, transparent 60%)`,
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, ${themeColor} 0, ${themeColor} 1px, transparent 0, transparent 50%)`,
                  backgroundSize: '24px 24px',
                  animation: 'bgPulse 4s ease-in-out infinite',
                }}
              />

              <div className="relative z-10 p-4 max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pt-2">
                  <button
                    onClick={() => setView('banners')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    ← バナーを変更
                  </button>
                  <div className="flex items-center gap-1.5 bg-yellow-900/40 px-3 py-1.5 rounded-full border border-yellow-600/30">
                    <span className="text-yellow-400 text-sm">🪙</span>
                    <span className="font-bold text-yellow-300 text-sm">{coinBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Banner info */}
                <div
                  className="rounded-2xl p-5 mb-6 relative overflow-hidden"
                  style={{
                    background: selectedBanner.bannerImageUrl
                      ? `linear-gradient(to bottom, ${themeColor}66, ${themeColor}cc), url(${selectedBanner.bannerImageUrl}) center/cover`
                      : `linear-gradient(135deg, ${themeColor}88, ${themeColor}44)`,
                    border: `1px solid ${themeColor}66`,
                  }}
                >
                  {selectedBanner.franchise && (
                    <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-1">
                      {selectedBanner.franchise}
                    </div>
                  )}
                  <div className="text-2xl font-black text-white drop-shadow">
                    {selectedBanner.name}
                  </div>
                  {selectedBanner.description && (
                    <div className="text-white/60 text-sm mt-1">{selectedBanner.description}</div>
                  )}
                </div>

                {/* Pity counter */}
                {selectedBanner.guaranteedSrAt && (
                  <div className="mb-5 bg-gray-800/60 rounded-xl px-4 py-3 border border-gray-700/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">SR確定天井まで</span>
                      <span className="font-bold text-purple-300">あと {remainingToCeiling} 回</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (pityCount / guaranteedSrAt) * 100)}%`,
                          background: `linear-gradient(to right, ${themeColor}, #a855f7)`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{pityCount} / {guaranteedSrAt}</div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">
                    {error}
                  </div>
                )}

                {/* Pull buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => pull(1)}
                    disabled={isPulling}
                    className="relative py-5 rounded-2xl font-bold transition-all disabled:opacity-50 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${themeColor}bb, ${themeColor}88)`,
                      border: `2px solid ${themeColor}66`,
                    }}
                  >
                    <div className="text-white text-lg font-black">1回引く</div>
                    <div className="text-white/70 text-sm mt-0.5">
                      🪙 {selectedBanner.costCoins}コイン
                    </div>
                    {isPulling && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => pull(10)}
                    disabled={isPulling}
                    className="relative py-5 rounded-2xl font-bold transition-all disabled:opacity-50 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                      border: `2px solid ${themeColor}99`,
                      boxShadow: `0 0 20px ${themeColor}44`,
                    }}
                  >
                    <div className="text-white text-lg font-black">10連</div>
                    <div className="text-white/80 text-sm mt-0.5">
                      🪙 {selectedBanner.cost10Coins ?? selectedBanner.costCoins * 10}コイン
                    </div>
                    <div className="text-white/60 text-xs mt-0.5">お得！</div>
                    {isPulling && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                </div>

                {freeGachaAvailable && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={pullFree}
                    disabled={isPulling}
                    className="mt-4 w-full py-3.5 rounded-xl border-2 border-green-500/60 bg-green-900/20 text-green-300 font-bold text-base flex items-center justify-center gap-2 hover:bg-green-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    🎁 今日の無料ガチャを引く
                    {isPulling && (
                      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </motion.button>
                )}

                {/* Odds hint */}
                <div className="mt-6 text-center text-xs text-gray-600">
                  UR: 0.5% / SSR: 2% / SR: 8% / R: 30% / N: 59.5%
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== RESULTS VIEW ===== */}
        <AnimatePresence>
          {view === 'results' && results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="min-h-screen p-4"
            >
              {/* Themed background for results */}
              <div
                className="fixed inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at top, ${themeColor}22 0%, transparent 60%)`,
                }}
              />

              <div className="relative z-10 max-w-2xl mx-auto">
                {/* Results header */}
                <div className="flex items-center justify-between mb-4 pt-2">
                  <h2 className="text-xl font-black">
                    🎴 結果
                    {newCount > 0 && (
                      <span className="ml-2 text-green-400 text-sm font-semibold">
                        ✨ {newCount} NEW!
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-2">
                    {!allRevealed && results.length > 1 && (
                      <button
                        onClick={handleRevealAll}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: themeColor }}
                      >
                        全部めくる
                      </button>
                    )}
                    {allRevealed && (
                      <button
                        onClick={closeResults}
                        className="px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
                      >
                        もう一度引く
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards grid */}
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

                {/* Remaining hint */}
                {!allRevealed && results.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-4 text-sm text-gray-500"
                  >
                    残り {results.length - revealedSet.size} 枚 — タップでめくろう！
                  </motion.div>
                )}

                {/* All revealed CTA */}
                {allRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-8 flex flex-col gap-3 items-center"
                  >
                    <button
                      onClick={closeResults}
                      className="px-8 py-3 rounded-2xl font-bold text-white transition-all hover:brightness-110"
                      style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
                    >
                      もう一度引く
                    </button>
                    <button
                      onClick={() => setView('banners')}
                      className="px-8 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 font-medium transition-colors"
                    >
                      バナー選択に戻る
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
