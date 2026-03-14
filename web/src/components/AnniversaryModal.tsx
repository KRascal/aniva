'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ========================================================
// Types
// ========================================================

interface AnniversaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  characterAvatar?: string;
  milestone: number;
  milestoneType: 'days' | 'messages';
  coinsEarned: number;
  gachaTickets?: number;
}

// ========================================================
// Helpers
// ========================================================

function getMilestoneLabel(milestone: number, type: 'days' | 'messages'): string {
  if (type === 'messages') return `${milestone.toLocaleString()}通記念`;
  if (milestone >= 365) return `${Math.floor(milestone / 365)}年記念`;
  if (milestone >= 30) return `${Math.floor(milestone / 30)}ヶ月記念`;
  if (milestone >= 7) return `${Math.floor(milestone / 7)}週間記念`;
  return `${milestone}日記念`;
}

function getCelebrationMessage(milestone: number, type: 'days' | 'messages', name: string): string {
  if (type === 'messages') {
    return `${name}との会話が${milestone.toLocaleString()}通に達しました！\nいつもありがとう。`;
  }
  if (milestone >= 365) return `${name}と一緒に${Math.floor(milestone / 365)}年間の素敵な時間を過ごしました。これからもよろしく！`;
  if (milestone === 100) return `${name}とついに100日！大切な時間をありがとう。`;
  if (milestone === 30) return `${name}と出会って1ヶ月。短いようで、とても濃い時間だったね。`;
  if (milestone === 14) return `${name}と2週間！もうすっかり仲良しだね。`;
  if (milestone === 7) return `${name}と出会って1週間！これからもっと仲良くなろうね。`;
  return `${name}と${milestone}日間、ありがとう！`;
}

// ========================================================
// Component
// ========================================================

export function AnniversaryModal({
  isOpen,
  onClose,
  characterName,
  characterAvatar,
  milestone,
  milestoneType,
  coinsEarned,
  gachaTickets,
}: AnniversaryModalProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // フェードイン
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // 1フレーム遅らせてアニメーション起動
      const t = setTimeout(() => setVisible(true), 16);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape キーで閉じる
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!mounted) return null;

  const label = getMilestoneLabel(milestone, milestoneType);
  const message = getCelebrationMessage(milestone, milestoneType, characterName);

  return (
    <>
      {/* ====== Global keyframe styles ====== */}
      <style>{`
        @keyframes aniv-fade-in {
          from { opacity: 0; transform: scale(0.88) translateY(24px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes aniv-fade-out {
          from { opacity: 1; transform: scale(1)    translateY(0);    }
          to   { opacity: 0; transform: scale(0.88) translateY(24px); }
        }
        @keyframes aniv-sparkle {
          0%, 100% { opacity: 0;   transform: translateY(0)    scale(0.5); }
          50%       { opacity: 0.8; transform: translateY(-28px) scale(1.2); }
        }
        @keyframes aniv-coin-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes aniv-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .aniv-modal-enter { animation: aniv-fade-in  0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .aniv-modal-exit  { animation: aniv-fade-out 0.3s  ease-in                           forwards; }
        .aniv-sparkle-1 { animation: aniv-sparkle 1.8s ease-in-out 0.1s infinite; }
        .aniv-sparkle-2 { animation: aniv-sparkle 1.8s ease-in-out 0.5s infinite; }
        .aniv-sparkle-3 { animation: aniv-sparkle 1.8s ease-in-out 0.9s infinite; }
        .aniv-sparkle-4 { animation: aniv-sparkle 1.8s ease-in-out 1.3s infinite; }
        .aniv-coin-pop  { animation: aniv-coin-pop  0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both; }
        .aniv-shimmer-text {
          background: linear-gradient(90deg, #d4a017, #fff8dc, #f5c518, #fff8dc, #d4a017);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: aniv-shimmer 3s linear infinite;
        }
      `}</style>

      {/* ====== Overlay ====== */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label={`${label}おめでとうございます`}
      >
        {/* ====== Modal card ====== */}
        <div
          className={`relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl ${
            visible ? 'aniv-modal-enter' : 'aniv-modal-exit'
          }`}
          style={{
            background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1.5px solid #d4a01780',
          }}
        >
          {/* --- Gold top border accent --- */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #b8860b, #ffd700, #f5c518, #ffd700, #b8860b)' }}
          />

          {/* --- Sparkle particles (CSS only) --- */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { top: '12%', left: '8%',  size: 6 },
              { top: '20%', left: '88%', size: 5 },
              { top: '65%', left: '5%',  size: 4 },
              { top: '70%', left: '92%', size: 7 },
            ].map(({ top, left, size }, i) => (
              <div
                key={i}
                className={`absolute rounded-full ${['aniv-sparkle-1','aniv-sparkle-2','aniv-sparkle-3','aniv-sparkle-4'][i]}`}
                style={{
                  top,
                  left,
                  width: size,
                  height: size,
                  background: 'radial-gradient(circle, #ffd700, #fff8dc)',
                  boxShadow: `0 0 ${size * 2}px ${size}px #ffd70060`,
                }}
              />
            ))}
          </div>

          {/* --- Content --- */}
          <div className="relative px-6 pb-8 pt-6 flex flex-col items-center text-center">
            {/* Avatar */}
            <div
              className="relative w-24 h-24 mb-4 rounded-full overflow-hidden"
              style={{
                boxShadow: '0 0 0 3px #ffd700, 0 0 20px #ffd70060',
                background: '#1a1a2e',
              }}
            >
              {characterAvatar ? (
                <Image
                  src={characterAvatar}
                  alt={characterName}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  ✨
                </div>
              )}
            </div>

            {/* Label (shimmer gold) */}
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#d4a017' }}>
              {milestoneType === 'days' ? '記念日' : 'メッセージ達成'}
            </p>

            {/* Milestone title */}
            <h2 className="text-3xl font-bold mb-1 aniv-shimmer-text">
              {label}！
            </h2>

            {/* Character name */}
            <p className="text-sm mb-4" style={{ color: '#a0a8b8' }}>
              {characterName}
            </p>

            {/* Divider */}
            <div
              className="w-16 h-px mb-4"
              style={{ background: 'linear-gradient(90deg, transparent, #ffd700, transparent)' }}
            />

            {/* Celebration message */}
            <p className="text-sm leading-relaxed mb-6 whitespace-pre-line" style={{ color: '#c8d0e0' }}>
              {message}
            </p>

            {/* Reward box */}
            <div
              className="w-full rounded-xl p-4 mb-6 aniv-coin-pop"
              style={{
                background: 'rgba(255,215,0,0.08)',
                border: '1px solid rgba(255,215,0,0.25)',
              }}
            >
              <p className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: '#d4a017' }}>
                獲得報酬
              </p>
              <div className="flex items-center justify-center gap-6">
                {/* Coins */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl">🪙</span>
                  <span className="text-xl font-bold" style={{ color: '#ffd700' }}>
                    +{coinsEarned}
                  </span>
                  <span className="text-xs" style={{ color: '#a0a8b8' }}>コイン</span>
                </div>

                {/* Gacha tickets (if any) */}
                {gachaTickets && gachaTickets > 0 && (
                  <>
                    <div
                      className="w-px h-12"
                      style={{ background: 'rgba(255,215,0,0.2)' }}
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">🎫</span>
                      <span className="text-xl font-bold" style={{ color: '#ffd700' }}>
                        +{gachaTickets}
                      </span>
                      <span className="text-xs" style={{ color: '#a0a8b8' }}>ガチャチケット</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #b8860b, #ffd700, #f5c518)',
                color: '#1a1a2e',
                boxShadow: '0 4px 16px rgba(255,215,0,0.3)',
              }}
            >
              受け取る ✓
            </button>
          </div>

          {/* --- Gold bottom border accent --- */}
          <div
            className="h-0.5 w-full"
            style={{ background: 'linear-gradient(90deg, #b8860b, #ffd700, #f5c518, #ffd700, #b8860b)' }}
          />
        </div>
      </div>
    </>
  );
}
