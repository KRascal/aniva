'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChatRow } from './ChatRow';
import type { Character, RelationshipInfo } from './types';

export function SwipeableChatRow({
  character,
  relationship,
  hasUnread,
  unreadCount = 0,
  isPinned = false,
  isMuted = false,
  isFanclub = false,
  onClick,
  onPin,
  onMute,
  onUnfollow,
}: {
  character: Character;
  relationship: RelationshipInfo;
  hasUnread: boolean;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isFanclub?: boolean;
  onClick: () => void;
  onPin: () => void;
  onMute: () => void;
  onUnfollow: () => void;
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeState, setSwipeState] = useState<'idle' | 'left-actions' | 'right-actions'>('idle');
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

    if (directionLocked.current === 'vertical') {
      return;
    }

    setIsSwiping(true);
    if (swipeState === 'left-actions' && deltaX < 0) {
      setTranslateX(Math.max(deltaX, -20));
    } else if (swipeState === 'right-actions' && deltaX > 0) {
      setTranslateX(Math.min(deltaX, 20));
    } else if (swipeState === 'idle') {
      setTranslateX(deltaX);
    }
  }, [swipeState]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) {
      if (directionLocked.current === 'vertical') {
        directionLocked.current = null;
        return;
      }
      if (swipeState !== 'idle') {
        setSwipeState('idle');
        setTranslateX(0);
      } else {
        onClick();
      }
      return;
    }

    const deltaX = translateX;
    if (swipeState === 'idle') {
      if (deltaX > 60) {
        setSwipeState('left-actions');
      } else if (deltaX < -60) {
        setSwipeState('right-actions');
      }
    } else {
      setSwipeState('idle');
    }
    setTranslateX(0);
    setIsSwiping(false);
  }, [isSwiping, translateX, swipeState, onClick]);

  useEffect(() => {
    if (swipeState === 'idle') return;
    const handleOutside = (e: TouchEvent | MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setSwipeState('idle');
      }
    };
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [swipeState]);

  const actionBtnBase = 'flex flex-col items-center justify-center gap-0.5 text-white text-[10px] font-semibold h-full min-w-[60px] px-2';

  return (
    <div ref={rowRef} className="relative overflow-hidden rounded-xl">
      {/* 左アクション（右スワイプで表示）: ピン留め + 通知オフ */}
      <div className="absolute inset-y-0 left-0 flex">
        <button
          onClick={() => { onPin(); setSwipeState('idle'); }}
          className={`${actionBtnBase} ${isPinned ? 'bg-yellow-600' : 'bg-blue-600'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
            <path d="M16 2l-4 4-6-2-2 2 4.5 4.5L2 17l1 1 6.5-6.5L14 16l2-2-2-6 4-4-2-2z"/>
          </svg>
          <span>{isPinned ? '解除' : 'ピン留め'}</span>
        </button>
        <button
          onClick={() => { onMute(); setSwipeState('idle'); }}
          className={`${actionBtnBase} ${isMuted ? 'bg-green-600' : 'bg-gray-600'}`}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
              <path d="M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
            </svg>
          )}
          <span>{isMuted ? '通知ON' : '通知OFF'}</span>
        </button>
      </div>

      {/* 右アクション（左スワイプで表示）: フォロー外し */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => { onUnfollow(); setSwipeState('idle'); }}
          className={`${actionBtnBase} bg-red-600`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="whitespace-nowrap">外す</span>
        </button>
      </div>

      {/* メインコンテンツ（スライドする） */}
      <div
        style={{
          transform: `translateX(${
            swipeState === 'left-actions' ? 128
            : swipeState === 'right-actions' ? -72
            : translateX
          }px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
        }}
        className="relative z-10 bg-gray-950"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ChatRow
          character={character}
          relationship={relationship}
          hasUnread={hasUnread}
          unreadCount={unreadCount}
          isPinned={isPinned}
          isMuted={isMuted}
          isFanclub={isFanclub}
          onClick={() => {/* handled by touch end */}}
        />
      </div>
    </div>
  );
}
