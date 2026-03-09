'use client';

import React, { useState, useRef, useCallback } from 'react';

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
  holoIntensity: number;
  sparkleCount: number;
}> = {
  N: {
    label: 'NORMAL',
    borderColor: 'rgba(107,114,128,0.7)',
    glowColor: 'rgba(107,114,128,0.3)',
    bgGradient: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
    backGradient: 'linear-gradient(145deg, #374151 0%, #1f2937 100%)',
    holoIntensity: 0,
    sparkleCount: 0,
  },
  R: {
    label: 'RARE',
    borderColor: 'rgba(59,130,246,0.8)',
    glowColor: 'rgba(59,130,246,0.5)',
    bgGradient: 'linear-gradient(145deg, #1e3a8a 0%, #1e40af 50%, #172554 100%)',
    backGradient: 'linear-gradient(145deg, #1e3a8a 0%, #1e40af 100%)',
    holoIntensity: 0.15,
    sparkleCount: 0,
  },
  SR: {
    label: 'S·RARE',
    borderColor: 'rgba(168,85,247,0.8)',
    glowColor: 'rgba(168,85,247,0.6)',
    bgGradient: 'linear-gradient(145deg, #4c1d95 0%, #6d28d9 50%, #3b0764 100%)',
    backGradient: 'linear-gradient(145deg, #4c1d95 0%, #6d28d9 100%)',
    holoIntensity: 0.25,
    sparkleCount: 5,
  },
  SSR: {
    label: 'S·S·RARE',
    borderColor: 'rgba(245,158,11,0.9)',
    glowColor: 'rgba(245,158,11,0.7)',
    bgGradient: 'linear-gradient(145deg, #78350f 0%, #b45309 50%, #451a03 100%)',
    backGradient: 'linear-gradient(145deg, #78350f 0%, #b45309 100%)',
    holoIntensity: 0.4,
    sparkleCount: 12,
  },
  UR: {
    label: 'ULTRA RARE',
    borderColor: 'rgba(244,114,182,0.95)',
    glowColor: 'rgba(244,114,182,0.8)',
    bgGradient: 'linear-gradient(145deg, #831843 0%, #6b21a8 33%, #1e3a8a 66%, #064e3b 100%)',
    backGradient: 'linear-gradient(135deg, #831843, #6b21a8, #1e3a8a, #064e3b, #78350f, #831843)',
    holoIntensity: 0.55,
    sparkleCount: 20,
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
  franchise = null,
}: GachaFlipCardProps) {
  const config = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.N;
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [isInteracting, setIsInteracting] = useState(false);

  // ---- タッチ/マウス追従 ----
  const updateMouse = useCallback((clientX: number, clientY: number) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    });
  }, []);

  // ---- スパークル位置 ----
  const sparkles = Array.from({ length: config.sparkleCount }, (_, i) => ({
    x: 5 + (i * 97 / Math.max(1, config.sparkleCount)) % 90,
    y: 8 + Math.sin(i * 2.1) * 35 + Math.cos(i * 1.3) * 20,
    size: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
    delay: i * 0.15,
  }));

  const holoAngle = mouse.x * 360;

  return (
    <>
      {/* ---- Safari互換スタイル (backface-visibility不使用) ---- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ppFlipOut {
          0%   { transform: perspective(600px) rotateY(0deg);   opacity: 1; }
          100% { transform: perspective(600px) rotateY(90deg);  opacity: 0; }
        }
        @keyframes ppFlipIn {
          0%   { transform: perspective(600px) rotateY(-90deg); opacity: 0; }
          100% { transform: perspective(600px) rotateY(0deg);   opacity: 1; }
        }
        @keyframes ppFlashReveal {
          0%   { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes ppGlowPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes ppRainbow {
          0%   { border-color: #ff0080; }
          20%  { border-color: #ff8c00; }
          40%  { border-color: #ffd700; }
          60%  { border-color: #40e0d0; }
          80%  { border-color: #8800ff; }
          100% { border-color: #ff0080; }
        }
        @keyframes ppSparkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50%       { opacity: 1;    transform: scale(1.3); }
        }
        @keyframes ppNewPop {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25%       { transform: scale(1.2) rotate(5deg); }
          75%       { transform: scale(0.9) rotate(-3deg); }
        }
        @keyframes ppURBg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pp-back-hide    { animation: ppFlipOut 0.2s ease-in forwards; }
        .pp-front-show   { animation: ppFlipIn  0.25s ease-out 0.2s forwards; opacity: 0; }
        .pp-front-stable { animation: none; opacity: 1; }
        .pp-ur-border    { animation: ppRainbow 3s linear infinite; }
        .pp-ur-bg        { background-size: 400% 400%; animation: ppURBg 4s ease infinite; }
      ` }} />

      <div
        ref={cardRef}
        onMouseMove={(e) => { updateMouse(e.clientX, e.clientY); }}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => { setIsInteracting(false); setMouse({ x: 0.5, y: 0.5 }); }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) updateMouse(t.clientX, t.clientY);
          e.stopPropagation(); // タブスワイプ競合防止
        }}
        onTouchStart={(e) => {
          setIsInteracting(true);
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          setIsInteracting(false);
          setMouse({ x: 0.5, y: 0.5 });
          e.stopPropagation();
        }}
        style={{
          width: '100%',
          position: 'relative',
          borderRadius: 14,
          boxShadow: [
            '0 4px 8px rgba(0,0,0,0.4)',
            '0 12px 24px rgba(0,0,0,0.25)',
            rarity !== 'N' ? `0 0 20px ${config.glowColor}` : '',
          ].filter(Boolean).join(', '),
          cursor: 'pointer',
        }}
      >
        {/* ==== BACK FACE ==== */}
        <div
          className={isFlipped ? 'pp-back-hide' : ''}
          onClick={() => !isFlipped && onFlip()}
          style={{
            position: isFlipped ? 'absolute' : 'relative',
            inset: 0,
            borderRadius: 14,
            border: `2px solid ${config.borderColor}`,
            background: config.backGradient,
            height: isFlipped ? '100%' : undefined,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px',
            minHeight: 220,
            overflow: 'hidden',
            zIndex: isFlipped ? 0 : 1,
            pointerEvents: isFlipped ? 'none' : 'auto',
          }}
        >
          {/* UR動くバック */}
          {rarity === 'UR' && (
            <div className="pp-ur-bg" style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: config.backGradient,
              pointerEvents: 'none',
            }} />
          )}
          {/* シマー */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: `linear-gradient(${holoAngle}deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          {/* 幾何学パターン背景 */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none' }} viewBox="0 0 120 180">
            <defs>
              <pattern id={`pp-${rarity}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M15 0L30 15L15 30L0 15Z" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="120" height="180" fill={`url(#pp-${rarity})`} />
          </svg>
          <div className="relative z-10 flex flex-col items-center gap-3 select-none">
            {/* ロゴマーク */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `2px solid ${config.borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: `0 0 20px ${config.glowColor}, inset 0 0 10px ${config.glowColor}`,
            }}>
              <span style={{
                fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em',
                background: `linear-gradient(135deg, ${config.borderColor}, white)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                A
              </span>
            </div>
            <div style={{
              fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.25em',
              color: config.borderColor, textTransform: 'uppercase',
            }}>
              TAP TO REVEAL
            </div>
            <div style={{
              fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              {config.label}
            </div>
          </div>
        </div>

        {/* ==== FRONT FACE ==== */}
        <div
          className={isFlipped ? 'pp-front-show pp-front-stable' : ''}
          style={{
            position: isFlipped ? 'relative' : 'absolute',
            inset: 0,
            borderRadius: 14,
            border: `2px solid ${config.borderColor}`,
            background: config.bgGradient,
            height: isFlipped ? undefined : '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            minHeight: 220,
            overflow: 'hidden',
            zIndex: isFlipped ? 1 : 0,
            opacity: isFlipped ? 1 : 0,
            pointerEvents: isFlipped ? 'auto' : 'none',
          }}
        >
          {/* UR Border */}
          {rarity === 'UR' && <div className="pp-ur-border absolute inset-[-2px] rounded-[14px] border-2" style={{ pointerEvents: 'none', zIndex: 30 }} />}

          {/* Flash reveal effect */}
          {isFlipped && (
            <div style={{
              position: 'absolute', inset: -10, borderRadius: 14,
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(200,180,255,0.4) 40%, transparent 70%)',
              animation: 'ppFlashReveal 0.7s ease-out forwards',
              pointerEvents: 'none', zIndex: 50,
            }} />
          )}

          {/* NEW バッジ */}
          {isNew && (
            <div style={{
              position: 'absolute', top: -6, right: -6,
              background: '#22c55e', color: 'white', fontSize: '0.6rem',
              fontWeight: 800, padding: '2px 7px', borderRadius: 9999, zIndex: 30,
              animation: 'ppNewPop 1.5s ease-in-out infinite',
            }}>
              ✨ NEW
            </div>
          )}

          {/* キャラクター画像 */}
          <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 8 }}>
            {characterAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={characterAvatarUrl}
                alt={characterName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = 'none';
                  const p = t.parentElement;
                  if (p) {
                    const fb = document.createElement('div');
                    fb.style.cssText = `width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, rgba(0,0,0,0.6), ${config.glowColor}30);`;
                    fb.innerHTML = `<span style="font-size:2.5rem;font-weight:900;background:linear-gradient(135deg,${config.borderColor},white);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${characterName?.[0] ?? '?'}</span>`;
                    p.insertBefore(fb, t.nextSibling);
                  }
                }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                background: `linear-gradient(135deg, rgba(0,0,0,0.6), ${config.glowColor}30)`,
              }}>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 900,
                  background: `linear-gradient(135deg, ${config.borderColor}, white)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {characterName.charAt(0) || '?'}
                </div>
              </div>
            )}
          </div>

          {/* カード情報 */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em',
              color: config.borderColor, textShadow: `0 0 8px ${config.glowColor}`,
            }}>
              {config.label}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {itemName}
            </div>
            {franchise && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {franchise}
              </div>
            )}
          </div>

          {/* ホログラム（R以上） */}
          {config.holoIntensity > 0 && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: `conic-gradient(from ${holoAngle}deg at ${mouse.x * 100}% ${mouse.y * 100}%, #ff000020, #ff880020, #ffff0020, #00ff0020, #0088ff20, #8800ff20, #ff000020)`,
              opacity: config.holoIntensity * (isInteracting ? 2.5 : 1),
              mixBlendMode: 'screen',
              transition: 'opacity 0.15s ease',
              pointerEvents: 'none', zIndex: 20,
            }} />
          )}

          {/* マウス追従ライト */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: `radial-gradient(ellipse at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(255,255,255,${isInteracting ? 0.2 : 0.06}) 0%, transparent 60%)`,
            pointerEvents: 'none', zIndex: 22,
          }} />

          {/* キラキラ (SR以上) */}
          {sparkles.map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: s.size, height: s.size,
              borderRadius: '50%',
              background: rarity === 'UR' ? '#ffd700' : 'white',
              left: `${s.x}%`, top: `${s.y}%`,
              boxShadow: rarity === 'UR'
                ? '0 0 6px 2px rgba(255,215,0,0.8)'
                : '0 0 4px 1px rgba(255,255,255,0.7)',
              animation: `ppSparkle ${1.5 + s.delay}s ease-in-out ${s.delay}s infinite`,
              pointerEvents: 'none', zIndex: 23,
            }} />
          ))}

          {/* SSR/URグロー */}
          {(rarity === 'SSR' || rarity === 'UR') && (
            <div style={{
              position: 'absolute', inset: -4, borderRadius: 18,
              boxShadow: `0 0 20px ${config.glowColor}, 0 0 40px ${config.glowColor}`,
              animation: 'ppGlowPulse 2s ease-in-out infinite',
              pointerEvents: 'none', zIndex: -1,
            }} />
          )}
        </div>
      </div>
    </>
  );
}
