'use client';

import { useMemo } from 'react';

/* ─── 口調カテゴリ型 ─── */
export type ToneCategory = 'cool' | 'cheerful' | 'gentle' | 'wild';

interface TypingIndicatorProps {
  characterName?: string;
  avatarUrl?: string | null;
  toneCategory?: ToneCategory;
}

/* ─── 口調別テキスト ─── */
const TONE_TEXTS: Record<ToneCategory, string[]> = {
  cool:     ['...', 'ちょっと待て'],
  cheerful: ['えーっとね！', 'あのね〜♪'],
  gentle:   ['少し考えてるの…', '言葉を探してる…'],
  wild:     ['おっしゃ！', '待ってろ！'],
};

const DEFAULT_TEXTS = [
  '{name}が考えてる…',
  '{name}が言葉を探してる…',
  '{name}がタイピング中…',
  'ちょっと待ってな…',
  'うーん、何て言おうかな…',
  '{name}があなたのこと考えてる…',
];

export function TypingIndicator({ characterName, avatarUrl, toneCategory }: TypingIndicatorProps) {
  /* CSS keyframesのみ — JSタイマーなし。初期テキストだけランダム選択 */
  const text = useMemo(() => {
    if (toneCategory) {
      const pool = TONE_TEXTS[toneCategory];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const t = DEFAULT_TEXTS[Math.floor(Math.random() * DEFAULT_TEXTS.length)];
    return t.replace('{name}', characterName ?? 'キャラ');
  }, [toneCategory, characterName]);

  return (
    <>
      <style>{`
        /* ── アバター pulsing purple ring ── */
        @keyframes avatarRingPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(168,85,247,0.7), 0 0 0 4px rgba(168,85,247,0.2); }
          50%       { box-shadow: 0 0 0 3px rgba(168,85,247,0.9), 0 0 0 7px rgba(168,85,247,0.08); }
        }
        .typing-avatar-ring {
          animation: avatarRingPulse 1.6s ease-in-out infinite;
          border-radius: 9999px;
        }

        /* ── SVG wave stroke draw ── */
        @keyframes waveDraw1 {
          0%   { stroke-dashoffset: 40; opacity: 0.3; }
          30%  { stroke-dashoffset: 0;  opacity: 1; }
          70%  { stroke-dashoffset: 0;  opacity: 1; }
          100% { stroke-dashoffset: 40; opacity: 0.3; }
        }
        @keyframes waveDraw2 {
          0%   { stroke-dashoffset: 40; opacity: 0.3; }
          30%  { stroke-dashoffset: 40; opacity: 0.3; }
          60%  { stroke-dashoffset: 0;  opacity: 1; }
          90%  { stroke-dashoffset: 0;  opacity: 1; }
          100% { stroke-dashoffset: 40; opacity: 0.3; }
        }
        @keyframes waveDraw3 {
          0%   { stroke-dashoffset: 40; opacity: 0.3; }
          50%  { stroke-dashoffset: 40; opacity: 0.3; }
          80%  { stroke-dashoffset: 0;  opacity: 1; }
          95%  { stroke-dashoffset: 0;  opacity: 1; }
          100% { stroke-dashoffset: 40; opacity: 0.3; }
        }
        .wave-stroke-1 {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: waveDraw1 1.8s ease-in-out infinite;
        }
        .wave-stroke-2 {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: waveDraw2 1.8s ease-in-out infinite;
        }
        .wave-stroke-3 {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: waveDraw3 1.8s ease-in-out infinite;
        }

        /* ── テキスト shimmer ── */
        @keyframes typingTextShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .typing-shimmer-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.01em;
          background: linear-gradient(90deg, #9ca3af 0%, #c084fc 40%, #f472b6 60%, #9ca3af 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: typingTextShimmer 2.2s linear infinite;
        }
      `}</style>

      {/* Glass カード全体 */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          background: 'rgba(31,31,47,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(168,85,247,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        }}
      >
        {/* キャラアバター (w-8 h-8) + pulsing purple ring */}
        <div className="typing-avatar-ring flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={characterName ?? 'キャラ'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm select-none">
              💬
            </div>
          )}
        </div>

        {/* 右側: SVG波 + テキスト */}
        <div className="flex flex-col gap-1 min-w-0">
          {/* SVG wave strokes */}
          <svg
            width="48"
            height="18"
            viewBox="0 0 48 18"
            fill="none"
            aria-hidden="true"
          >
            {/* wave 1 */}
            <path
              className="wave-stroke-1"
              d="M2 9 C5 5, 9 13, 13 9"
              stroke="url(#waveGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* wave 2 */}
            <path
              className="wave-stroke-2"
              d="M18 9 C21 5, 25 13, 29 9"
              stroke="url(#waveGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* wave 3 */}
            <path
              className="wave-stroke-3"
              d="M34 9 C37 5, 41 13, 45 9"
              stroke="url(#waveGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>

          {/* テキスト */}
          <span className="typing-shimmer-text truncate max-w-[160px]">{text}</span>
        </div>
      </div>
    </>
  );
}
