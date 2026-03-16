'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface GroupConversation {
  id: string;
  updatedAt: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
  characters: Array<{ id: string; name: string; slug: string; avatarUrl: string | null }>;
  lastMessage: { role: string; content: string; createdAt: string; characterName?: string } | null;
}

interface Props {
  conversation: GroupConversation;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function timeAgo(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

export function SwipeableGroupChatRow({ conversation, onClick, onPin, onDelete }: Props) {
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

    if (directionLocked.current === 'vertical') return;

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

  const isPinned = !!conversation.isPinned;
  const charNames = conversation.characters.map(c => c.name.split('・')[0]).join(' × ');
  const actionBtnBase = 'flex flex-col items-center justify-center gap-0.5 text-white text-[10px] font-semibold h-full min-w-[60px] px-2';

  return (
    <div ref={rowRef} className="relative overflow-hidden rounded-xl">
      {/* 左アクション（右スワイプ）: ピン留め */}
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
      </div>

      {/* 右アクション（左スワイプ）: 削除 */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => { onDelete(); setSwipeState('idle'); }}
          className={`${actionBtnBase} bg-red-600`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="whitespace-nowrap">削除</span>
        </button>
      </div>

      {/* メインコンテンツ */}
      <div
        style={{
          transform: `translateX(${
            swipeState === 'left-actions' ? 68
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
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
          style={{
            background: 'rgba(139,92,246,0.06)',
            border: '1px solid rgba(139,92,246,0.15)',
          }}
          onClick={() => swipeState === 'idle' && onClick()}
        >
          {/* ピンアイコン */}
          {isPinned && (
            <svg className="absolute top-2 right-3 w-3 h-3 text-yellow-400 opacity-70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 2l-4 4-6-2-2 2 4.5 4.5L2 17l1 1 6.5-6.5L14 16l2-2-2-6 4-4-2-2z"/>
            </svg>
          )}

          {/* アバター群 */}
          <div className="flex -space-x-2 flex-shrink-0">
            {conversation.characters.slice(0, 3).map((c, i) => (
              c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={c.id}
                  src={c.avatarUrl}
                  alt={c.name}
                  className="w-9 h-9 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 2px rgb(3,7,18)', zIndex: 3 - i }}
                />
              ) : (
                <div
                  key={c.id}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-purple-700"
                  style={{ zIndex: 3 - i }}
                >
                  {c.name.charAt(0)}
                </div>
              )
            ))}
          </div>

          {/* テキスト */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-purple-400 font-bold">GROUP</span>
              <span className="text-sm font-semibold text-white truncate">{charNames}</span>
            </div>
            {conversation.lastMessage ? (
              <p className="text-xs text-white/50 truncate">
                {conversation.lastMessage.role === 'USER'
                  ? 'あなた: '
                  : `${conversation.lastMessage.characterName ?? ''}: `}
                {conversation.lastMessage.content.slice(0, 40)}
              </p>
            ) : (
              <p className="text-xs text-white/30">グループチャット</p>
            )}
          </div>

          <span className="text-xs text-white/30 flex-shrink-0">{timeAgo(conversation.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
