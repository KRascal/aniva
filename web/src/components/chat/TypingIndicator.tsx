'use client';

import { useState, useEffect } from 'react';

interface TypingIndicatorProps {
  characterName?: string;
  avatarUrl?: string | null;
}

// キャラの口調に合わせたランダム入力中テキスト
const TYPING_TEXTS = [
  '{name}が考えてる…',
  '{name}が言葉を探してる…',
  '{name}がタイピング中…',
  'ちょっと待ってな…',
  'うーん、何て言おうかな…',
  '{name}がメッセージ書いてる…',
];

export function TypingIndicator({ characterName, avatarUrl }: TypingIndicatorProps) {
  const [textIdx, setTextIdx] = useState(0);

  useEffect(() => {
    const idx = Math.floor(Math.random() * TYPING_TEXTS.length);
    setTextIdx(idx);
  }, []);

  const text = TYPING_TEXTS[textIdx].replace('{name}', characterName ?? 'キャラ');

  return (
    <>
      <style>{`
        @keyframes typingWave {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-7px) scale(1.15); opacity: 1; }
        }
        @keyframes thinkingPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.9; transform: scale(1); }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          animation: typingWave 0.9s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(168, 85, 247, 0.5);
        }
        .typing-dot:nth-child(1) { animation-delay: 0ms; }
        .typing-dot:nth-child(2) { animation-delay: 160ms; }
        .typing-dot:nth-child(3) { animation-delay: 320ms; }
        .thinking-text {
          font-size: 11px;
          background: linear-gradient(90deg, #9ca3af 0%, #a855f7 40%, #ec4899 60%, #9ca3af 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerText 2s linear infinite;
        }
        .thinking-icon {
          animation: thinkingPulse 1.4s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col gap-1.5">
        {characterName && (
          <div className="flex items-center gap-2 pl-1">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={characterName}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0 opacity-90"
              />
            ) : (
              <span className="thinking-icon text-sm flex-shrink-0">💭</span>
            )}
            <span className="thinking-text font-medium">
              {text}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-5 py-3.5 bg-gray-800/90 rounded-2xl rounded-tl-none backdrop-blur-sm border border-gray-700/50 w-fit">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </>
  );
}
