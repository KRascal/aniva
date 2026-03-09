'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GachaParticleCanvas } from './GachaParticleCanvas';

export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface GachaRarityOverlayProps {
  rarity: GachaRarity;
  /** バナーテーマカラー (hex) — 省略時は '#6d28d9' */
  themeColor?: string;
  /** アニメーション完了コールバック */
  onComplete: () => void;
}

type OverlayPhase = 0 | 1 | 2 | 3 | 4;

// --- 振動パターン ---
function vibrateForRarity(rarity: GachaRarity): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const patterns: Partial<Record<GachaRarity, number[]>> = {
    R:   [50],
    SR:  [80, 50, 80],
    SSR: [100, 50, 100, 50, 200],
    UR:  [200, 100, 200, 100, 300, 100, 500],
  };
  const pattern = patterns[rarity];
  if (pattern) navigator.vibrate(pattern);
}

// --- スキップボタン ---
function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      onClick={onSkip}
      className="absolute bottom-8 right-6 z-[70] text-sm text-white/50 hover:text-white/90 transition-colors bg-black/30 px-3 py-1.5 rounded-lg border border-white/10"
    >
      スキップ →
    </button>
  );
}

// --- 亀裂SVGオーバーレイ ---
function CrackOverlay({ color }: { color: string }) {
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes crackIn {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes crackDraw {
          0%   { stroke-dashoffset: 300; opacity: 0; }
          20%  { opacity: 1; }
          70%  { stroke-dashoffset: 0; opacity: 1; }
          100% { opacity: 0; }
        }
        .crack-svg { animation: crackIn 1.2s ease-out forwards; }
        .crack-line { stroke-dasharray: 300; animation: crackDraw 1.2s ease-out forwards; }
        .crack-line-2 { animation-delay: 0.15s; }
        .crack-line-3 { animation-delay: 0.25s; }
      `}</style>
      <svg
        className="crack-svg absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="crack-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polyline className="crack-line" points="200,400 180,250 140,100 100,0" fill="none" stroke={color} strokeWidth="3" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-2" points="200,400 230,320 300,200 380,80" fill="none" stroke={color} strokeWidth="2.5" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-2" points="200,400 160,480 80,620 20,800" fill="none" stroke={color} strokeWidth="2.5" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-3" points="200,400 260,450 350,560 400,700" fill="none" stroke={color} strokeWidth="2" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-3" points="200,400 120,380 0,360" fill="none" stroke={color} strokeWidth="2" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-3" points="200,400 320,390 400,400" fill="none" stroke={color} strokeWidth="1.5" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-3" points="180,250 150,230 120,240" fill="none" stroke={color} strokeWidth="1.5" filter="url(#crack-glow)" />
        <polyline className="crack-line crack-line-3" points="230,320 260,300 280,310" fill="none" stroke={color} strokeWidth="1.5" filter="url(#crack-glow)" />
      </svg>
    </div>
  );
}

// --- メインコンポーネント ---
export function GachaRarityOverlay({ rarity, themeColor = '#6d28d9', onComplete }: GachaRarityOverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>(0);
  const [showParticles, setShowParticles] = useState(false);
  const [showCrack, setShowCrack] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSkip = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    setSkipped(true);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    vibrateForRarity(rarity);

    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    if (rarity === 'N') {
      // N: 白いフラッシュ 0.3秒 → 完了
      t(300, onComplete);
      return;
    }

    if (rarity === 'R') {
      // R: 青い光のバースト 0.4秒 → 完了 0.7秒
      t(0,   () => setShowParticles(true));
      t(700, onComplete);
      return;
    }

    if (rarity === 'SR') {
      // SR: 2段演出 1.5秒
      t(100,  () => setPhase(1));
      t(300,  () => setShowParticles(true));
      t(700,  () => setShowCrack(true));
      t(1500, onComplete);
      return;
    }

    if (rarity === 'SSR') {
      // SSR: 3段演出 3.0秒
      t(300,  () => setPhase(1));
      t(500,  () => setShowParticles(true));
      t(900,  () => setShowCrack(true));
      t(1500, () => setPhase(2));
      t(3000, onComplete);
      return;
    }

    if (rarity === 'UR') {
      // UR: 5段演出 4.8秒
      t(300,  () => setPhase(1));
      t(600,  () => setShowCrack(true));
      t(1200, () => setPhase(2));
      t(1800, () => setPhase(3));
      t(2000, () => setShowParticles(true));
      t(2500, () => setPhase(4));
      t(4800, onComplete);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [rarity, onComplete]);

  if (skipped) return null;

  // --- N: 白いフラッシュ 0.3秒 ---
  if (rarity === 'N') {
    return (
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.6)', animation: 'nFlash 0.3s ease-out forwards' }}
      >
        <style>{`
          @keyframes nFlash {
            0%   { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // --- R: 青い光のバースト ---
  if (rarity === 'R') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <style>{`
          @keyframes rPulse {
            0%   { opacity: 0; transform: scale(0.5); }
            30%  { opacity: 1; transform: scale(1); }
            70%  { opacity: 0.8; transform: scale(1.2); }
            100% { opacity: 0; transform: scale(1.5); }
          }
          @keyframes fadeOut { to { opacity: 0; } }
        `}</style>
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.6) 0%, rgba(96,165,250,0.3) 40%, transparent 70%)',
            animation: 'rPulse 0.7s ease-out forwards',
          }}
        />
        {showParticles && <GachaParticleCanvas preset="r-burst" />}
      </div>
    );
  }

  // --- SR: 紫の光輪 + フラッシュ — 2段演出 ---
  if (rarity === 'SR') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85">
        <style>{`
          @keyframes srPillarIn {
            0%   { transform: scaleY(0) scaleX(0.3); opacity: 0; }
            40%  { transform: scaleY(1) scaleX(1); opacity: 1; }
            100% { transform: scaleY(1.1) scaleX(1.5); opacity: 0; }
          }
          @keyframes srFlash {
            0%   { opacity: 0; }
            50%  { opacity: 0.9; }
            100% { opacity: 0; }
          }
          @keyframes srTextIn {
            0%   { opacity: 0; transform: scale(0.5); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes srRingExpand {
            0%   { r: 0; opacity: 0.9; }
            100% { r: 200; opacity: 0; }
          }
        `}</style>

        {/* 放射グラデーション背景 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.4) 0%, transparent 70%)',
          }}
        />

        {/* 光の柱 */}
        {phase >= 1 && (
          <div
            className="absolute"
            style={{
              width: '8px',
              height: '100vh',
              background: 'linear-gradient(to bottom, transparent, rgba(196,132,252,0.9) 30%, white 50%, rgba(196,132,252,0.9) 70%, transparent)',
              boxShadow: '0 0 40px 20px rgba(168,85,247,0.7)',
              animation: 'srPillarIn 1.2s ease-out forwards',
              transformOrigin: 'center center',
            }}
          />
        )}

        {/* 画面フラッシュ */}
        {phase >= 1 && (
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.5), transparent 60%)',
              animation: 'srFlash 0.4s ease-out 0.7s forwards',
              opacity: 0,
            }}
          />
        )}

        {/* SR テキスト */}
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

        {showParticles && <GachaParticleCanvas preset="sr-snowfall" />}
        {showCrack && <CrackOverlay color="rgba(196,132,252,0.9)" />}
        <SkipButton onSkip={handleSkip} />
      </div>
    );
  }

  // --- SSR: 金色フラッシュ + 放射線 + SUPER RARE テキスト + 金色パルス — 3段演出 ---
  if (rarity === 'SSR') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90" style={phase >= 1 ? { animation: 'ssrScreenShake 0.4s ease-out' } : undefined}>
        <style>{`
          @keyframes ssrBgPulse {
            0%   { opacity: 0; }
            30%  { opacity: 1; }
            70%  { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes ssrTitleIn {
            0%   { opacity: 0; transform: translateY(20px) scale(0.8); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes ssrShine {
            0%,100% { text-shadow: 0 0 20px rgba(250,204,21,0.8); }
            50%     { text-shadow: 0 0 60px rgba(250,204,21,1), 0 0 100px rgba(250,204,21,0.6); }
          }
          @keyframes ssrRay {
            0%   { opacity: 0; transform: rotate(var(--ray-angle)) scaleY(0); }
            30%  { opacity: 0.6; }
            100% { opacity: 0; transform: rotate(var(--ray-angle)) scaleY(1.2); }
          }
          @keyframes ssrRainbow {
            0%   { transform: translateX(-100%); opacity: 0; }
            20%  { opacity: 0.8; }
            80%  { opacity: 0.8; }
            100% { transform: translateX(100%); opacity: 0; }
          }
          @keyframes ssrGoldFlash {
            0%   { opacity: 0; }
            15%  { opacity: 1; }
            40%  { opacity: 0.7; }
            100% { opacity: 0; }
          }
          @keyframes ssrGoldPulse {
            0%,100% { opacity: 0.3; transform: scale(1); }
            50%     { opacity: 0.7; transform: scale(1.05); }
          }
          @keyframes ssrSuperIn {
            0%   { opacity: 0; transform: scale(0.3) translateY(30px); letter-spacing: 0.5em; }
            60%  { opacity: 1; transform: scale(1.1) translateY(-5px); }
            100% { opacity: 1; transform: scale(1) translateY(0); letter-spacing: 0.3em; }
          }
          @keyframes ssrScreenShake {
            0%, 100% { transform: translate(0); }
            10% { transform: translate(-3px, 2px); }
            20% { transform: translate(4px, -3px); }
            30% { transform: translate(-2px, 4px); }
            40% { transform: translate(3px, -2px); }
            50% { transform: translate(-4px, 3px); }
            60% { transform: translate(2px, -4px); }
            70% { transform: translate(-3px, 2px); }
            80% { transform: translate(3px, -1px); }
            90% { transform: translate(-1px, 3px); }
          }
          @keyframes ssrGoldenRing {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            40% { opacity: 0.9; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          }
          @keyframes ssrGoldenRingSpin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>

        {/* 金色グラデーションのパルス背景 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.5) 0%, rgba(245,158,11,0.3) 40%, rgba(161,108,15,0.15) 70%, transparent 100%)',
            animation: 'ssrGoldPulse 1.5s ease-in-out infinite',
          }}
        />

        {/* 背景グロー */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(161,108,15,0.5) 0%, transparent 80%)',
            animation: 'ssrBgPulse 3s ease-in-out',
          }}
        />

        {/* 金色フラッシュ（白→金色） */}
        {phase >= 1 && (
          <div
            className="absolute inset-0 z-30 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.8) 30%, rgba(245,158,11,0.5) 60%, transparent 85%)',
              animation: 'ssrGoldFlash 0.6s ease-out forwards',
            }}
          />
        )}

        {/* 放射線 12本（増量） */}
        {phase >= 1 &&
          Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={
                {
                  '--ray-angle': `${i * 30}deg`,
                  width: '3px',
                  height: '150vh',
                  top: '50%',
                  left: '50%',
                  marginLeft: '-1.5px',
                  marginTop: '-75vh',
                  background:
                    'linear-gradient(to bottom, transparent, rgba(251,191,36,0.8) 50%, transparent)',
                  transformOrigin: 'center 75vh',
                  transform: `rotate(${i * 30}deg)`,
                  animation: `ssrRay 2.5s ${i * 0.08}s ease-out forwards`,
                } as React.CSSProperties
              }
            />
          ))}

        {/* 虹色走査線 */}
        {phase >= 1 && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              width: '40%',
              left: '30%',
              background:
                'linear-gradient(to right, transparent, rgba(255,0,0,0.3), rgba(255,165,0,0.3), rgba(255,255,0,0.3), rgba(0,255,0,0.3), rgba(0,0,255,0.3), rgba(139,0,255,0.3), transparent)',
              animation: 'ssrRainbow 1s ease-in-out 0.5s forwards',
            }}
          />
        )}

        {/* ✨ SUPER RARE ✨ テキスト */}
        {phase >= 1 && (
          <div
            className="absolute text-center z-10"
            style={{ animation: 'ssrSuperIn 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.4s both' }}
          >
            <div
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b, #fde68a)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'ssrShine 1s ease-in-out 0.8s infinite',
                letterSpacing: '0.3em',
              }}
            >
              ✨ SUPER RARE ✨
            </div>
            <div style={{
              color: '#fbbf24',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              fontWeight: 500,
              letterSpacing: '0.4em',
            }}>
              ✦ ULTRA PULL ✦
            </div>
          </div>
        )}

        {/* 金色スピニングリング */}
        {phase >= 2 && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: 'min(70vw, 350px)',
              height: 'min(70vw, 350px)',
              top: '50%',
              left: '50%',
              borderRadius: '50%',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #fde68a, #f59e0b, #fbbf24, #fde68a) 1',
              animation: 'ssrGoldenRing 0.6s ease-out forwards, ssrGoldenRingSpin 3s linear 0.6s infinite',
              boxShadow: '0 0 40px 10px rgba(251,191,36,0.3), inset 0 0 30px 8px rgba(251,191,36,0.15)',
            }}
          />
        )}

        {showParticles && <GachaParticleCanvas preset="ssr-rise" />}
        {showCrack && <CrackOverlay color="rgba(255,235,100,0.9)" />}
        <SkipButton onSkip={handleSkip} />
      </div>
    );
  }

  // --- UR: 暗転→金の亀裂→虹色爆発→光の柱 — ソシャゲ級5段演出 ---
  const urBgByPhase: Record<number, string> = {
    1: `radial-gradient(ellipse at center, ${themeColor} 0%, ${themeColor}88 60%, transparent 100%)`,
    2: 'rgba(255,255,255,0.95)',
    3: 'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8800ff, #ff00ff)',
    4: `radial-gradient(ellipse at center, ${themeColor}44 0%, transparent 70%)`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={phase >= 2 ? { animation: 'urScreenShake 0.5s ease-out' } : undefined}>
      <style>{`
        @keyframes urFlood  { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes urBurst  { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(3); } }
        @keyframes urRainbow {
          0%   { transform: translateX(-100%); opacity: 0; }
          30%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes urTitleIn {
          0%  { opacity: 0; transform: scale(0.3) rotate(-10deg); }
          60% { transform: scale(1.1) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes urTitleShine {
          0%,100% { filter: brightness(1) drop-shadow(0 0 20px gold); }
          50%     { filter: brightness(1.5) drop-shadow(0 0 40px gold) drop-shadow(0 0 80px gold); }
        }
        @keyframes urFadeOut { to { opacity: 0; } }
        @keyframes urDarken  { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes urRainbowRingSpin {
          0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.8; }
        }
        @keyframes urRainbowPulse {
          0%,100% { opacity: 0.15; filter: hue-rotate(0deg); }
          25%     { opacity: 0.35; filter: hue-rotate(90deg); }
          50%     { opacity: 0.25; filter: hue-rotate(180deg); }
          75%     { opacity: 0.35; filter: hue-rotate(270deg); }
        }
        @keyframes urLightPillar {
          0%   { transform: scaleY(0); opacity: 0; }
          30%  { opacity: 1; }
          60%  { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(1); opacity: 0; }
        }
        @keyframes urSubTextIn {
          0%   { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes urSubTextPulse {
          0%,100% { opacity: 0.8; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
          50%     { opacity: 1; text-shadow: 0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(251,191,36,0.5); }
        }
        @keyframes urRingGlow {
          0%,100% { box-shadow: 0 0 40px 10px rgba(251,191,36,0.3), inset 0 0 40px 10px rgba(251,191,36,0.1); }
          50%     { box-shadow: 0 0 80px 20px rgba(251,191,36,0.6), inset 0 0 60px 15px rgba(251,191,36,0.2); }
        }
        @keyframes urScreenShake {
          0%, 100% { transform: translate(0); }
          5%  { transform: translate(-6px, 4px); }
          10% { transform: translate(8px, -6px); }
          15% { transform: translate(-5px, 7px); }
          20% { transform: translate(7px, -4px); }
          25% { transform: translate(-8px, 5px); }
          30% { transform: translate(4px, -7px); }
          35% { transform: translate(-6px, 3px); }
          40% { transform: translate(5px, -3px); }
          50% { transform: translate(-3px, 5px); }
          60% { transform: translate(3px, -2px); }
          70% { transform: translate(-2px, 2px); }
          80% { transform: translate(1px, -1px); }
        }
        @keyframes urShockwave {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          50%  { opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
      `}</style>

      {/* フェーズ0: 初期暗転 */}
      {phase === 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ animation: 'urDarken 0.6s ease-out forwards' }}
        />
      )}

      {/* フェーズ1: テーマカラーグロー */}
      {phase === 1 && (
        <div
          className="absolute inset-0"
          style={{
            background: urBgByPhase[1],
            animation: 'urFlood 0.6s ease-out forwards',
          }}
        />
      )}

      {/* フェーズ2: 白い爆発 */}
      {phase === 2 && (
        <div
          className="absolute inset-0"
          style={{
            background: urBgByPhase[2],
            animation: 'urBurst 0.5s ease-out forwards',
          }}
        />
      )}

      {/* フェーズ3: 虹色スウィープ + 全画面虹色パルス */}
      {phase === 3 && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: urBgByPhase[3],
              animation: 'urRainbow 1s ease-in-out forwards',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, #ff0000, #ff7700, #ffff00, #00ff00, #00ffff, #0077ff, #8800ff, #ff00ff, #ff0000)',
              animation: 'urRainbowPulse 2s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* フェーズ4: フェードアウト */}
      {phase >= 4 && (
        <div
          className="absolute inset-0"
          style={{
            background: urBgByPhase[4],
            animation: 'urFadeOut 0.8s ease-out forwards',
          }}
        />
      )}

      {/* レインボー回転リング */}
      {phase >= 2 && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 'min(80vw, 400px)',
            height: 'min(80vw, 400px)',
            top: '50%',
            left: '50%',
            borderRadius: '50%',
            border: '4px solid transparent',
            borderImage: 'conic-gradient(from 0deg, #ff0000, #ff7700, #ffff00, #00ff00, #00ffff, #0077ff, #8800ff, #ff00ff, #ff0000) 1',
            animation: 'urRainbowRingSpin 3s linear infinite, urRingGlow 1.5s ease-in-out infinite',
          }}
        />
      )}
      {/* 2重目の回転リング（逆回転・大きめ） */}
      {phase >= 2 && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 'min(95vw, 500px)',
            height: 'min(95vw, 500px)',
            top: '50%',
            left: '50%',
            borderRadius: '50%',
            border: '2px solid transparent',
            borderImage: 'conic-gradient(from 180deg, #ff00ff, #8800ff, #0077ff, #00ffff, #00ff00, #ffff00, #ff7700, #ff0000, #ff00ff) 1',
            animation: 'urRainbowRingSpin 4s linear reverse infinite',
            opacity: 0.6,
          }}
        />
      )}

      {/* 光の柱（亀裂エフェクト後に画面上部から降りてくる） */}
      {phase >= 3 && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: '60px',
            height: '100vh',
            top: 0,
            left: '50%',
            marginLeft: '-30px',
            transformOrigin: 'center top',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.8) 20%, rgba(245,158,11,0.6) 50%, rgba(251,191,36,0.3) 80%, transparent 100%)',
            boxShadow: '0 0 80px 30px rgba(251,191,36,0.5), 0 0 150px 60px rgba(255,255,255,0.3)',
            animation: 'urLightPillar 1.8s ease-out forwards',
          }}
        />
      )}
      {/* サブ光の柱（左右） */}
      {phase >= 3 && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              width: '20px',
              height: '100vh',
              top: 0,
              left: '30%',
              transformOrigin: 'center top',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(251,191,36,0.4) 30%, transparent 80%)',
              boxShadow: '0 0 40px 15px rgba(251,191,36,0.3)',
              animation: 'urLightPillar 1.8s ease-out 0.2s forwards',
              opacity: 0,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: '20px',
              height: '100vh',
              top: 0,
              left: '70%',
              transformOrigin: 'center top',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(251,191,36,0.4) 30%, transparent 80%)',
              boxShadow: '0 0 40px 15px rgba(251,191,36,0.3)',
              animation: 'urLightPillar 1.8s ease-out 0.35s forwards',
              opacity: 0,
            }}
          />
        </>
      )}

      {/* 🌟 ULTRA RARE 🌟 テキスト */}
      {phase >= 1 && (
        <div
          className="absolute text-center z-20"
          style={{ animation: 'urTitleIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          <div
            style={{
              fontWeight: 900,
              letterSpacing: '0.15em',
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              background:
                'linear-gradient(135deg, #fde68a, #f59e0b, #ef4444, #ec4899, #8b5cf6, #60a5fa, #34d399, #fde68a)',
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'urTitleShine 1s ease-in-out 0.3s infinite',
            }}
          >
            🌟 ULTRA RARE 🌟
          </div>
          {/* 「極めて希少なカードが！」サブテキスト */}
          {phase >= 3 && (
            <div
              style={{
                color: '#ffffff',
                fontSize: 'clamp(0.875rem, 3vw, 1.25rem)',
                marginTop: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.3em',
                animation: 'urSubTextIn 0.6s ease-out forwards, urSubTextPulse 1.5s ease-in-out 0.6s infinite',
              }}
            >
              極めて希少なカードが！
            </div>
          )}
          <div style={{
            color: '#ffffff',
            fontSize: '0.75rem',
            marginTop: '0.5rem',
            letterSpacing: '0.4em',
            opacity: 0.9,
          }}>
            ✦ ✦ ✦&nbsp;&nbsp;LEGENDARY&nbsp;&nbsp;✦ ✦ ✦
          </div>
        </div>
      )}

      {/* 衝撃波リング（phase 2以降、3連続） */}
      {phase >= 2 && [0, 250, 500].map((delay, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: '80px',
            height: '80px',
            top: '50%',
            left: '50%',
            borderRadius: '50%',
            border: '3px solid rgba(255,220,80,0.9)',
            animation: `urShockwave 1.2s ease-out ${delay}ms forwards`,
            boxShadow: '0 0 20px 5px rgba(255,220,80,0.5)',
          }}
        />
      ))}

      {showParticles && <GachaParticleCanvas preset="ur-explosion" delayMs={100} />}
      {showCrack && <CrackOverlay color="rgba(255,220,80,0.95)" />}
      <SkipButton onSkip={handleSkip} />
    </div>
  );
}
