'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * 汎用スワイプ行コンポーネント
 * 右スワイプ → 左側にアクションボタン表示
 */
export function SwipeableRow({
  children,
  isPinned = false,
  onPin,
}: {
  children: React.ReactNode;
  isPinned?: boolean;
  onPin?: () => void;
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [showActions, setShowActions] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
    directionLocked.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (!directionLocked.current) {
      if (Math.abs(deltaY) > 15 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        directionLocked.current = 'vertical';
        return;
      }
      if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        directionLocked.current = 'horizontal';
      } else {
        return;
      }
    }
    if (directionLocked.current !== 'horizontal') return;

    setIsSwiping(true);
    // 右スワイプ（正の値）でアクション表示
    const clamped = Math.max(-10, Math.min(80, deltaX));
    setTranslateX(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (translateX > 40) {
      setShowActions(true);
      setTranslateX(72);
    } else {
      setShowActions(false);
      setTranslateX(0);
    }
    setIsSwiping(false);
    directionLocked.current = null;
  }, [translateX]);

  // 外部タップで閉じる
  useEffect(() => {
    if (!showActions) return;
    const handler = (e: TouchEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setTranslateX(0);
      }
    };
    document.addEventListener('touchstart', handler, { passive: true });
    return () => document.removeEventListener('touchstart', handler);
  }, [showActions]);

  return (
    <div ref={rowRef} className="relative overflow-hidden rounded-2xl">
      {/* アクションボタン（左側に表示） */}
      <div className="absolute inset-y-0 left-0 flex items-center z-0">
        <button
          onClick={() => {
            onPin?.();
            setShowActions(false);
            setTranslateX(0);
          }}
          className="w-16 h-full flex flex-col items-center justify-center gap-0.5"
          style={{ background: isPinned ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)' }}
        >
          <svg className={`w-4 h-4 ${isPinned ? 'text-red-400' : 'text-yellow-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className={`text-[9px] font-bold ${isPinned ? 'text-red-400' : 'text-yellow-400'}`}>
            {isPinned ? '解除' : 'ピン'}
          </span>
        </button>
      </div>

      {/* コンテンツ */}
      <div
        className="relative z-10"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          background: 'rgb(3,7,18)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
