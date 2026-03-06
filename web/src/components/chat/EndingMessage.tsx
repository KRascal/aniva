'use client';

/**
 * EndingMessage.tsx
 * ピークエンドの法則 — 会話終了時の特別メッセージ表示コンポーネント
 * グラデーション背景 + フェードインアニメーション + 星パーティクル
 */

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/* ─────────────── 型 ─────────────── */
export interface EndingMessageProps {
  content: string;
  characterName: string;
  characterAvatarUrl?: string | null;
  /** フェードイン完了後コールバック */
  onAnimationComplete?: () => void;
}

/* ─────────────── 星パーティクル ─────────────── */
interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDuration: number;
  animationDelay: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.6 + 0.2,
    animationDuration: Math.random() * 2 + 1.5,
    animationDelay: Math.random() * 2,
  }));
}

const STARS = generateStars(18);

/* ─────────────── コンポーネント ─────────────── */
export function EndingMessage({
  content,
  characterName,
  characterAvatarUrl,
  onAnimationComplete,
}: EndingMessageProps) {
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 少し遅らせてからフェードイン（前のメッセージとの区別）
    timerRef.current = setTimeout(() => {
      setVisible(true);
      setTimeout(() => {
        setTextVisible(true);
        onAnimationComplete?.();
      }, 400);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onAnimationComplete]);

  return (
    <div
      className="flex flex-col items-start gap-2 px-2 my-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
      }}
      role="status"
      aria-label="会話のエンディングメッセージ"
    >
      {/* ラベル */}
      <div
        className="flex items-center gap-1 text-xs text-purple-300/70 ml-10 mb-0.5"
        style={{ opacity: textVisible ? 1 : 0, transition: 'opacity 0.4s ease 0.2s' }}
      >
        <span>✨</span>
        <span>今日の別れ際に…</span>
      </div>

      {/* メッセージバブル */}
      <div className="flex items-end gap-2 w-full max-w-xs sm:max-w-sm">
        {/* アバター */}
        <div className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
          {characterAvatarUrl ? (
            <Image
              src={characterAvatarUrl}
              alt={characterName}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
              {characterName.slice(0, 1)}
            </div>
          )}
        </div>

        {/* バブル本体 */}
        <div
          className="relative overflow-hidden rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(88,28,135,0.85) 0%, rgba(157,23,77,0.80) 50%, rgba(67,20,100,0.90) 100%)',
            border: '1px solid rgba(192,132,252,0.35)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 20px rgba(168,85,247,0.25), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {/* 星パーティクル */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {STARS.map((star) => (
              <div
                key={star.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  opacity: star.opacity,
                  animation: `endingStarTwinkle ${star.animationDuration}s ease-in-out ${star.animationDelay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* テキスト */}
          <p
            className="relative z-10 text-sm leading-relaxed text-purple-50 font-medium"
            style={{
              opacity: textVisible ? 1 : 0,
              transform: textVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {content}
          </p>

          {/* 装飾ハイライト */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
            }}
          />
        </div>
      </div>

      {/* CSS アニメーション定義 */}
      <style>{`
        @keyframes endingStarTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default EndingMessage;
