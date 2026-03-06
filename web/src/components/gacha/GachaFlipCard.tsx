'use client';

import React from 'react';

// ---- Types ----
export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface GachaFlipCardProps {
  rarity: GachaRarity;
  characterName: string;
  characterAvatarUrl: string | null;
  itemName: string;
  isFlipped: boolean;
  onFlip: () => void;
  /** オプション: NEW バッジを表示するか */
  isNew?: boolean;
  /** オプション: フレームタイプ (gold | rainbow | null) */
  frameType?: string | null;
  /** オプション: フランチャイズ名 */
  franchise?: string | null;
}

// ---- Rarity スタイル定義 ----
const RARITY_STYLES: Record<GachaRarity, {
  bg: string;
  border: string;
  text: string;
  label: string;
  backBg: string;
  backBorder: string;
  backGlow: string;
  backMark: string;
}> = {
  N: {
    bg: 'bg-gray-700',
    border: 'border-gray-500',
    text: 'text-gray-300',
    label: 'NORMAL',
    backBg: 'linear-gradient(135deg, #374151 0%, #1f2937 50%, #374151 100%)',
    backBorder: 'rgba(107,114,128,0.5)',
    backGlow: 'rgba(107,114,128,0.4)',
    backMark: '⬜',
  },
  R: {
    bg: 'bg-blue-900',
    border: 'border-blue-500',
    text: 'text-blue-300',
    label: 'RARE',
    backBg: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%)',
    backBorder: 'rgba(59,130,246,0.5)',
    backGlow: 'rgba(59,130,246,0.5)',
    backMark: '🔷',
  },
  SR: {
    bg: 'bg-purple-900',
    border: 'border-purple-400',
    text: 'text-purple-200',
    label: 'S·RARE',
    backBg: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #4c1d95 100%)',
    backBorder: 'rgba(168,85,247,0.5)',
    backGlow: 'rgba(168,85,247,0.6)',
    backMark: '🔮',
  },
  SSR: {
    bg: 'bg-yellow-900',
    border: 'border-yellow-400',
    text: 'text-yellow-200',
    label: 'S·S·RARE',
    backBg: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #78350f 100%)',
    backBorder: 'rgba(245,158,11,0.6)',
    backGlow: 'rgba(245,158,11,0.7)',
    backMark: '⭐',
  },
  UR: {
    bg: 'bg-gradient-to-br from-pink-900 via-purple-900 to-blue-900',
    border: 'border-pink-400',
    text: 'text-pink-200',
    label: 'ULTRA RARE',
    backBg: 'linear-gradient(135deg, #831843, #6b21a8, #1e3a8a, #064e3b, #78350f, #831843)',
    backBorder: 'rgba(244,114,182,0.7)',
    backGlow: 'rgba(244,114,182,0.8)',
    backMark: '🌈',
  },
};

// ---- GachaFlipCard コンポーネント ----
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
  const style = RARITY_STYLES[rarity] ?? RARITY_STYLES.N;
  const isHighRarity = rarity === 'SSR' || rarity === 'UR';

  // フレームボーダースタイル
  const frameStyle: React.CSSProperties = (() => {
    if (frameType === 'gold') return { borderColor: '#f59e0b', borderWidth: '3px' };
    if (frameType === 'rainbow') return {
      borderImage: 'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8800ff) 1',
      borderWidth: '3px',
      borderStyle: 'solid',
    };
    return {};
  })();

  return (
    <>
      <style>{`
        .gacha-flip-scene { perspective: 800px; }
        .gacha-flip-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
          transform-style: preserve-3d;
        }
        .gacha-flip-inner.flipped { transform: rotateY(180deg); }
        .gacha-flip-face {
          position: absolute; width: 100%; height: 100%;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          border-radius: 12px; overflow: hidden;
        }
        .gacha-flip-back {
          display: flex; align-items: center; justify-content: center;
          border: 2px solid; cursor: pointer;
        }
        .gacha-flip-front { transform: rotateY(180deg); }

        @keyframes gfcGlowGold {
          0%,100% { box-shadow: 0 0 20px rgba(250,204,21,0.5); }
          50% { box-shadow: 0 0 50px rgba(250,204,21,0.9), 0 0 100px rgba(250,204,21,0.4); }
        }
        @keyframes gfcGlowUR {
          0%,100% { box-shadow: 0 0 30px rgba(244,114,182,0.6); }
          33% { box-shadow: 0 0 60px rgba(168,85,247,0.9), 0 0 120px rgba(168,85,247,0.5); }
          66% { box-shadow: 0 0 60px rgba(59,130,246,0.9), 0 0 120px rgba(59,130,246,0.5); }
        }
        .gfc-ssr-glow { animation: gfcGlowGold 1.5s ease-in-out infinite; }
        .gfc-ur-glow  { animation: gfcGlowUR 2s ease-in-out infinite; }

        @keyframes gfcShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .gfc-shimmer-bg {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: gfcShimmer 1.5s ease-in-out infinite;
        }
        @keyframes gfcNewSparkle {
          0%,100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.3) rotate(10deg); }
          75% { transform: scale(0.9) rotate(-5deg); }
        }
        .gfc-new-badge { animation: gfcNewSparkle 1.2s ease-in-out infinite; }

        @keyframes gfcBackShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .gfc-back-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: gfcBackShimmer 2s ease-in-out infinite;
        }

        @keyframes gfcRainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gfc-ur-back-rainbow {
          background: linear-gradient(135deg, #831843, #6b21a8, #1e3a8a, #064e3b, #78350f, #831843);
          background-size: 400% 400%;
          animation: gfcRainbow 3s ease infinite;
        }
      `}</style>

      <div className="gacha-flip-scene" style={{ height: '200px' }}>
        <div className={`gacha-flip-inner ${isFlipped ? 'flipped' : ''}`}>

          {/* ===== カード裏面（未公開） ===== */}
          <div
            className="gacha-flip-face gacha-flip-back"
            style={{
              background: rarity === 'UR' ? undefined : style.backBg,
              borderColor: style.backBorder,
              boxShadow: `0 0 16px ${style.backGlow}`,
            }}
            onClick={() => !isFlipped && onFlip()}
          >
            {/* UR は rainbow クラスで動的グラデーション */}
            {rarity === 'UR' && (
              <div className="gfc-ur-back-rainbow absolute inset-0 rounded-xl" />
            )}

            <div className="relative flex flex-col items-center gap-2 select-none z-10">
              {/* レアリティマーク */}
              <div className="text-4xl">{style.backMark}</div>
              {/* ? テキスト */}
              <div
                className="text-2xl font-black"
                style={{
                  color: style.backBorder,
                  textShadow: `0 0 12px ${style.backGlow}`,
                  fontFamily: 'serif',
                }}
              >
                ？
              </div>
              <span className="text-xs font-medium" style={{ color: style.backBorder }}>
                タップでめくる
              </span>
            </div>
            <div className="gfc-back-shimmer absolute inset-0 rounded-xl pointer-events-none" />
          </div>

          {/* ===== カード表面（公開後） ===== */}
          <div className="gacha-flip-face gacha-flip-front">
            <div
              className={`relative w-full h-full border-2 p-3 flex flex-col ${style.bg} ${style.border} ${
                isFlipped && rarity === 'SSR' ? 'gfc-ssr-glow' : ''
              } ${
                isFlipped && rarity === 'UR' ? 'gfc-ur-glow' : ''
              }`}
              style={{ borderRadius: '12px', ...frameStyle }}
            >
              {/* NEW バッジ */}
              {isNew && (
                <div className="gfc-new-badge absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold z-10">
                  ✨ NEW
                </div>
              )}

              {/* シマーエフェクト（SSR/UR） */}
              {isHighRarity && isFlipped && (
                <div className="gfc-shimmer-bg absolute inset-0 pointer-events-none rounded-xl z-0" />
              )}

              {/* キャラクター画像 */}
              {characterAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={characterAvatarUrl}
                  alt={characterName}
                  className="w-full flex-1 object-cover rounded-lg mb-2 min-h-0 relative z-10"
                />
              ) : (
                <div className="w-full flex-1 rounded-lg mb-2 flex items-center justify-center bg-black/30 text-4xl min-h-0 relative z-10">
                  🃏
                </div>
              )}

              {/* レアリティラベル */}
              <div className={`text-xs font-bold mb-0.5 relative z-10 ${style.text}`}>
                {style.label}
              </div>

              {/* アイテム名 */}
              <div className="text-sm font-semibold truncate text-white relative z-10">
                {itemName}
              </div>

              {/* フランチャイズ */}
              {franchise && (
                <div className="text-xs text-gray-300 truncate relative z-10">{franchise}</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
