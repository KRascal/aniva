'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ---- Types ----
export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface GachaFlipCardProps {
  rarity: GachaRarity;
  characterName: string;
  characterAvatarUrl: string | null;
  itemName: string;
  isFlipped: boolean;
  onFlip: () => void;
  isNew?: boolean;
  frameType?: string | null;
  franchise?: string | null;
}

// ---- Rarity Config ----
const RARITY_CONFIG: Record<GachaRarity, {
  label: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  backGradient: string;
  holoIntensity: number;   // 0=なし, 0.15=ライト, 0.3=ミディアム, 0.5=フル
  sparkleCount: number;
  hasParallax: boolean;
  hasPrismatic: boolean;    // 虹色プリズム演出
}> = {
  N: {
    label: 'NORMAL',
    borderColor: 'rgba(107,114,128,0.6)',
    glowColor: 'rgba(107,114,128,0.3)',
    bgGradient: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
    backGradient: 'linear-gradient(145deg, #374151 0%, #1f2937 100%)',
    holoIntensity: 0,
    sparkleCount: 0,
    hasParallax: false,
    hasPrismatic: false,
  },
  R: {
    label: 'RARE',
    borderColor: 'rgba(59,130,246,0.7)',
    glowColor: 'rgba(59,130,246,0.4)',
    bgGradient: 'linear-gradient(145deg, #1e3a8a 0%, #1e40af 50%, #172554 100%)',
    backGradient: 'linear-gradient(145deg, #1e3a8a 0%, #1e40af 100%)',
    holoIntensity: 0.15,
    sparkleCount: 0,
    hasParallax: false,
    hasPrismatic: false,
  },
  SR: {
    label: 'S·RARE',
    borderColor: 'rgba(168,85,247,0.7)',
    glowColor: 'rgba(168,85,247,0.5)',
    bgGradient: 'linear-gradient(145deg, #4c1d95 0%, #6d28d9 50%, #3b0764 100%)',
    backGradient: 'linear-gradient(145deg, #4c1d95 0%, #6d28d9 100%)',
    holoIntensity: 0.25,
    sparkleCount: 5,
    hasParallax: false,
    hasPrismatic: false,
  },
  SSR: {
    label: 'S·S·RARE',
    borderColor: 'rgba(245,158,11,0.8)',
    glowColor: 'rgba(245,158,11,0.6)',
    bgGradient: 'linear-gradient(145deg, #78350f 0%, #b45309 50%, #451a03 100%)',
    backGradient: 'linear-gradient(145deg, #78350f 0%, #b45309 100%)',
    holoIntensity: 0.4,
    sparkleCount: 12,
    hasParallax: true,
    hasPrismatic: true,
  },
  UR: {
    label: 'ULTRA RARE',
    borderColor: 'rgba(244,114,182,0.9)',
    glowColor: 'rgba(244,114,182,0.7)',
    bgGradient: 'linear-gradient(145deg, #831843 0%, #6b21a8 33%, #1e3a8a 66%, #064e3b 100%)',
    backGradient: 'linear-gradient(135deg, #831843, #6b21a8, #1e3a8a, #064e3b, #78350f, #831843)',
    holoIntensity: 0.55,
    sparkleCount: 20,
    hasParallax: true,
    hasPrismatic: true,
  },
};

// ---- Component ----
export function GachaFlipCard({
  rarity,
  characterName,
  characterAvatarUrl,
  itemName,
  isFlipped,
  onFlip,
  isNew = false,
  frameType = null,
  franchise = null,
}: GachaFlipCardProps) {
  const config = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.N;
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [gyroAvailable, setGyroAvailable] = useState(false);

  // ---- タッチ/マウス傾き ----
  const updateTilt = useCallback((clientX: number, clientY: number) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTilt({
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    updateTilt(e.clientX, e.clientY);
  }, [updateTilt]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) updateTilt(touch.clientX, touch.clientY);
  }, [updateTilt]);

  // ---- ジャイロスコープ対応 (モバイル) ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      setGyroAvailable(true);
      // gamma: -90〜90 (左右傾き), beta: -180〜180 (前後傾き)
      const x = Math.max(0, Math.min(1, (e.gamma + 45) / 90));
      const y = Math.max(0, Math.min(1, (e.beta - 20 + 45) / 90));
      setTilt({ x, y });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // ---- 3D変換計算 ----
  const maxTilt = 20;
  const rotX = isInteracting || gyroAvailable ? (tilt.y - 0.5) * -maxTilt : 0;
  const rotY = isInteracting || gyroAvailable ? (tilt.x - 0.5) * maxTilt : 0;

  // ホログラム角度 (回折格子シミュレーション)
  const holoAngle = tilt.x * 360;
  const holoShift = ((tilt.x - 0.5) ** 2 + (tilt.y - 0.5) ** 2) ** 0.5;

  // ---- キラキラ星の位置計算 ----
  const sparkles = Array.from({ length: config.sparkleCount }, (_, i) => ({
    x: 5 + (i * 97 / Math.max(1, config.sparkleCount)) % 90,
    y: 8 + Math.sin(i * 2.1) * 35 + Math.cos(i * 1.3) * 20,
    size: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
    delay: i * 0.15,
  }));

  return (
    <>
      <style>{`
        /* ===== カード3Dシーン ===== */
        .pokepoke-scene { perspective: 1000px; }
        .pokepoke-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
        }
        .pokepoke-inner.flipped { transform: rotateY(180deg); }
        .pokepoke-face {
          position: absolute; width: 100%; height: 100%;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          border-radius: 14px; overflow: hidden;
        }
        .pokepoke-front { transform: rotateY(180deg); }

        /* ===== カードの厚み（ポケポケの核心） ===== */
        .pokepoke-inner::before,
        .pokepoke-inner::after {
          content: '';
          position: absolute;
          background: linear-gradient(to bottom, #2a2a3a, #1a1a2a);
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
        /* 左右の側面 */
        .pokepoke-inner::before {
          width: 4px; height: 100%; top: 0; left: -2px;
          transform: rotateY(-90deg) translateZ(2px);
        }
        .pokepoke-inner::after {
          width: 4px; height: 100%; top: 0; right: -2px;
          transform: rotateY(90deg) translateZ(2px);
        }

        /* ===== フリップ時のフラッシュ演出 ===== */
        @keyframes ppFlipFlash {
          0%   { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        .pokepoke-inner.flipped .pokepoke-front::after {
          content: '';
          position: absolute;
          inset: -10px;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(200,180,255,0.5) 40%, transparent 70%);
          border-radius: 14px;
          animation: ppFlipFlash 0.8s ease-out forwards;
          pointer-events: none;
          z-index: 50;
        }

        /* ===== ホログラム回折格子 ===== */
        @keyframes ppHoloShift {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        /* ===== SSR/URグロー ===== */
        @keyframes ppGlowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* ===== URレインボーボーダー ===== */
        @keyframes ppRainbowBorder {
          0%   { border-color: #ff0080; }
          20%  { border-color: #ff8c00; }
          40%  { border-color: #ffd700; }
          60%  { border-color: #40e0d0; }
          80%  { border-color: #8800ff; }
          100% { border-color: #ff0080; }
        }
        .pp-ur-border { animation: ppRainbowBorder 3s linear infinite; }

        /* ===== URバックグラウンドアニメーション ===== */
        @keyframes ppURBack {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pp-ur-back {
          background-size: 400% 400%;
          animation: ppURBack 4s ease infinite;
        }

        /* ===== スパークルアニメーション ===== */
        @keyframes ppSparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        /* ===== NEWバッジ ===== */
        @keyframes ppNewPop {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.15) rotate(5deg); }
          75% { transform: scale(0.95) rotate(-3deg); }
        }
      `}</style>

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => { setIsInteracting(false); setTilt({ x: 0.5, y: 0.5 }); }}
        onTouchMove={handleTouchMove}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => { setIsInteracting(false); setTilt({ x: 0.5, y: 0.5 }); }}
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: isInteracting ? 'transform 0.05s linear' : 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          borderRadius: '14px',
          display: 'inline-block',
          width: '100%',
          // カードの厚み影（ポケポケ的）
          boxShadow: [
            `0 ${2 + Math.abs(rotX) * 0.5}px ${4 + Math.abs(rotX)}px rgba(0,0,0,0.3)`,
            `0 ${8 + Math.abs(rotX)}px ${16 + Math.abs(rotX) * 2}px rgba(0,0,0,0.25)`,
            `0 ${16 + Math.abs(rotX) * 1.5}px 32px rgba(0,0,0,0.15)`,
            rarity !== 'N' ? `0 0 ${12 + holoShift * 30}px ${config.glowColor}` : '',
          ].filter(Boolean).join(', '),
        }}
      >
        <div className="pokepoke-scene" style={{ height: '220px' }}>
          <div className={`pokepoke-inner ${isFlipped ? 'flipped' : ''}`}>

            {/* ===== 裏面 ===== */}
            <div
              className="pokepoke-face"
              style={{
                background: config.backGradient,
                border: `2px solid ${config.borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => !isFlipped && onFlip()}
            >
              {rarity === 'UR' && <div className="pp-ur-back absolute inset-0 rounded-[12px]" style={{ background: config.backGradient, backgroundSize: '400% 400%' }} />}

              <div className="relative flex flex-col items-center gap-3 select-none z-10">
                {/* ANIVA ロゴ/パターン */}
                <div style={{
                  fontSize: '2.5rem',
                  filter: `drop-shadow(0 0 8px ${config.glowColor})`,
                }}>
                  {rarity === 'UR' ? '🌈' : rarity === 'SSR' ? '⭐' : rarity === 'SR' ? '🔮' : rarity === 'R' ? '🔷' : '🃏'}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: config.borderColor,
                  textTransform: 'uppercase',
                }}>
                  TAP TO REVEAL
                </div>
              </div>

              {/* 裏面シマー */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '12px',
                background: `linear-gradient(${holoAngle}deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)`,
                pointerEvents: 'none',
              }} />
            </div>

            {/* ===== 表面 ===== */}
            <div className={`pokepoke-face pokepoke-front ${rarity === 'UR' ? 'pp-ur-border' : ''}`}
              style={{ border: `2px solid ${config.borderColor}` }}
            >
              <div
                className="relative w-full h-full flex flex-col"
                style={{ background: config.bgGradient, borderRadius: '12px', padding: '10px' }}
              >
                {/* NEW バッジ */}
                {isNew && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#22c55e', color: 'white', fontSize: '0.65rem',
                    fontWeight: 800, padding: '2px 6px', borderRadius: '9999px', zIndex: 30,
                    animation: 'ppNewPop 1.5s ease-in-out infinite',
                  }}>
                    ✨ NEW
                  </div>
                )}

                {/* キャラクター画像 */}
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden relative mb-2">
                  {characterAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={characterAvatarUrl}
                      alt={characterName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/40 text-4xl">🃏</div>
                  )}

                  {/* === 視差効果（SSR/UR）: 画像がわずかに動く === */}
                  {config.hasParallax && isFlipped && (
                    <div style={{
                      position: 'absolute', inset: '-8px',
                      background: characterAvatarUrl
                        ? `url(${characterAvatarUrl}) center/110% no-repeat`
                        : 'none',
                      transform: `translate(${(tilt.x - 0.5) * 8}px, ${(tilt.y - 0.5) * 8}px)`,
                      transition: isInteracting ? 'transform 0.05s linear' : 'transform 0.6s ease',
                      opacity: 0.15,
                      filter: 'blur(4px)',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>

                {/* カード情報 */}
                <div className="relative z-10">
                  <div style={{
                    fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em',
                    color: config.borderColor,
                    textShadow: `0 0 8px ${config.glowColor}`,
                  }}>
                    {config.label}
                  </div>
                  <div className="text-sm font-bold text-white truncate">{itemName}</div>
                  {franchise && <div className="text-xs text-white/40 truncate">{franchise}</div>}
                </div>

                {/* ===== ホログラム Layer 1: 回折格子 (R以上) ===== */}
                {config.holoIntensity > 0 && isFlipped && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '12px',
                    background: `
                      conic-gradient(
                        from ${holoAngle}deg at ${tilt.x * 100}% ${tilt.y * 100}%,
                        #ff000020, #ff880020, #ffff0020, #00ff0020, #0088ff20, #8800ff20, #ff000020
                      )
                    `,
                    opacity: config.holoIntensity * (isInteracting ? 2.5 : 1),
                    mixBlendMode: 'screen',
                    transition: 'opacity 0.15s ease',
                    pointerEvents: 'none', zIndex: 20,
                  }} />
                )}

                {/* ===== ホログラム Layer 2: 虹色プリズム (SSR/UR) ===== */}
                {config.hasPrismatic && isFlipped && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '12px',
                    background: `
                      repeating-linear-gradient(
                        ${holoAngle + 90}deg,
                        rgba(255,0,128,0.08) 0px,
                        rgba(255,200,0,0.08) 3px,
                        rgba(0,255,200,0.08) 6px,
                        rgba(0,128,255,0.08) 9px,
                        rgba(128,0,255,0.08) 12px,
                        rgba(255,0,128,0.08) 15px
                      )
                    `,
                    opacity: isInteracting ? 0.6 : 0.15,
                    mixBlendMode: 'color-dodge',
                    transition: 'opacity 0.15s ease',
                    pointerEvents: 'none', zIndex: 21,
                  }} />
                )}

                {/* ===== マウス/タッチ追従ライト ===== */}
                {isFlipped && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '12px',
                    background: `radial-gradient(
                      ellipse at ${tilt.x * 100}% ${tilt.y * 100}%,
                      rgba(255,255,255,${isInteracting ? 0.25 : 0.08}) 0%,
                      transparent 60%
                    )`,
                    pointerEvents: 'none', zIndex: 22,
                    transition: isInteracting ? 'none' : 'background 0.4s ease',
                  }} />
                )}

                {/* ===== キラキラ星 (SR以上) ===== */}
                {sparkles.map((s, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: s.size, height: s.size,
                    borderRadius: '50%',
                    background: rarity === 'UR' ? '#ffd700' : 'white',
                    left: `${s.x}%`, top: `${s.y}%`,
                    opacity: isFlipped ? undefined : 0,
                    boxShadow: rarity === 'UR'
                      ? '0 0 6px 2px rgba(255,215,0,0.8), 0 0 12px rgba(255,200,50,0.5)'
                      : '0 0 4px 1px rgba(255,255,255,0.7)',
                    transform: isInteracting
                      ? `translate(${(tilt.x - 0.5) * 15}px, ${(tilt.y - 0.5) * 15}px)`
                      : 'translate(0,0)',
                    animation: isFlipped ? `ppSparkle ${1.5 + s.delay}s ease-in-out ${s.delay}s infinite` : 'none',
                    transition: isInteracting ? 'transform 0.05s linear' : 'transform 0.6s ease',
                    pointerEvents: 'none', zIndex: 23,
                  }} />
                ))}

                {/* ===== SSR/URグローパルス ===== */}
                {(rarity === 'SSR' || rarity === 'UR') && isFlipped && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: '18px',
                    boxShadow: `0 0 20px ${config.glowColor}, 0 0 40px ${config.glowColor}`,
                    animation: 'ppGlowPulse 2s ease-in-out infinite',
                    pointerEvents: 'none', zIndex: -1,
                  }} />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
