'use client';

interface CoinIconProps {
  size?: number;
  className?: string;
}

/**
 * 統一コインアイコン — 全ページで一貫したコインデザインを使用
 * 絵文字(🪙💰)の代わりにこのSVGを使うこと
 */
export function CoinIcon({ size = 16, className = '' }: CoinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label="コイン"
    >
      {/* 外円 */}
      <circle cx="12" cy="12" r="11" fill="url(#coinGrad)" stroke="#b8860b" strokeWidth="1" />
      {/* 内円 */}
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#b8860b" strokeWidth="0.8" opacity="0.5" />
      {/* C テキスト */}
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fill="#92400e"
        fontFamily="system-ui, sans-serif"
      >
        C
      </text>
      <defs>
        <linearGradient id="coinGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}
