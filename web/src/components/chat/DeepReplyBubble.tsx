'use client';

/**
 * DeepReplyBubble
 * Deep Reply 専用のメッセージバブル。
 * 通常のキャラメッセージより少し特別感のある演出を付ける。
 */

import { useEffect, useState } from 'react';

interface DeepReplyBubbleProps {
  content: string;
  isProcessing?: boolean;
  characterName?: string;
}

export function DeepReplyBubble({
  content,
  isProcessing = false,
  characterName,
}: DeepReplyBubbleProps) {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (isProcessing) {
    return (
      <div className="flex items-start gap-2 animate-pulse">
        <div className="flex-1 min-w-0">
          <div className="inline-block max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-800/80 border border-purple-500/20">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs text-purple-400/70">
                {characterName ? `${characterName}が考えてます` : '考えてます'}{dots}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="relative inline-block max-w-[85%]">
          {/* 特別感の強調: 左上に小さなスパークルアイコン */}
          <div className="absolute -top-2 -left-1 text-xs text-purple-400/80 select-none">✦</div>
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-800 border border-purple-500/30 shadow-sm shadow-purple-500/10">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </p>
          </div>
          {/* Deep Reply ラベル */}
          <div className="mt-1 ml-1 flex items-center gap-1">
            <span className="text-[10px] text-purple-400/60">💭 じっくり考えた返答</span>
          </div>
        </div>
      </div>
    </div>
  );
}
