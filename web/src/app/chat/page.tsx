'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getDailyState } from '@/lib/character-daily-state';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface Character {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn: string;
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
}

interface ProactiveMessage {
  id: string;
  message: string;
  triggerType: string;
  isRead: boolean;
  createdAt: string;
  expiresAt: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}

interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  lastMessageAt: string | null;
  isFollowing?: boolean;
  isFanclub?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  pinnedAt?: string | null;
  character?: { name: string; slug: string; avatarUrl?: string | null };
  lastMessage?: { content: string; role: string } | null;
}

/* ── LINE-style chat row for fanclub characters ── */
function ChatRow({
  character,
  relationship,
  hasUnread,
  unreadCount = 0,
  isPinned = false,
  isMuted = false,
  onClick,
}: {
  character: Character;
  relationship: RelationshipInfo;
  hasUnread: boolean;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  onClick: () => void;
}) {
  const lastMsg = relationship.lastMessage;
  const lastAt = relationship.lastMessageAt;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'たった今';
    if (mins < 60) return `${mins}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  };

  const previewText = lastMsg
    ? (lastMsg.role === 'USER' ? `あなた: ${lastMsg.content}` : lastMsg.content)
    : 'メッセージを送ってみよう！';

  const level = relationship.level;
  const filledStars = Math.min(level, 5);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 active:bg-gray-800/70 transition-colors text-left"
    >
      {/* アバター — LINE風 丸型 + ピン留めバッジ */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden">
          {character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg font-bold text-white">
              {character.name.charAt(0)}
            </div>
          )}
        </div>
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-950" />
        )}
        {isPinned && (
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-yellow-500 border-2 border-gray-950 flex items-center justify-center" title="ピン留め">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M16 2l-4 4-6-2-2 2 4.5 4.5L2 17l1 1 6.5-6.5L14 16l2-2-2-6 4-4-2-2z"/>
            </svg>
          </span>
        )}
      </div>

      {/* テキスト情報 — LINE風コンパクト */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-white text-sm truncate">{character.name}</span>
          {isMuted && (
            <span className="flex-shrink-0" title="通知オフ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          <span className="text-[10px] text-gray-500 flex-shrink-0 ml-auto">{formatTime(lastAt)}</span>
        </div>
        <p className="text-sm text-gray-400 truncate mt-0.5">
          {previewText}
        </p>
      </div>

      {/* 未読カウント */}
      {hasUnread && unreadCount > 0 && (
        <div className="flex-shrink-0">
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}

/* ── Swipeable chat row wrapper ── */
function SwipeableChatRow({
  character,
  relationship,
  hasUnread,
  unreadCount = 0,
  isPinned = false,
  isMuted = false,
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

    // 方向ロック: 最初に大きく動いた方向で確定
    if (!directionLocked.current) {
      if (Math.abs(deltaY) > 15 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        directionLocked.current = 'vertical';
        return;
      }
      if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        directionLocked.current = 'horizontal';
      } else {
        return; // まだ方向未確定
      }
    }

    // 垂直スクロールにロック済み → スワイプしない
    if (directionLocked.current === 'vertical') {
      return;
    }

    // 横スワイプ
    setIsSwiping(true);
    // スワイプ状態がある場合は戻す方向のみ許可
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
      // 縦スクロール中 → タップとして扱わない
      if (directionLocked.current === 'vertical') {
        directionLocked.current = null;
        return;
      }
      // タップ → チャットへ遷移（方向ロック未確定 = 移動が少なかった = 純粋なタップ）
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
      // 戻す
      setSwipeState('idle');
    }
    setTranslateX(0);
    setIsSwiping(false);
  }, [isSwiping, translateX, swipeState, onClick]);

  // 外部タップで閉じる
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
          onClick={() => {/* handled by touch end */}}
        />
      </div>
    </div>
  );
}

/* ── gradient palette per index ── */
const CARD_GRADIENTS = [
  'from-purple-600/80 via-pink-600/60 to-rose-600/80',
  'from-blue-600/80 via-cyan-500/60 to-teal-600/80',
  'from-orange-500/80 via-amber-500/60 to-yellow-500/80',
  'from-green-600/80 via-emerald-500/60 to-cyan-600/80',
  'from-indigo-600/80 via-violet-500/60 to-purple-600/80',
  'from-rose-600/80 via-red-500/60 to-orange-600/80',
];

const GLOW_COLORS = [
  'hover:shadow-purple-500/40',
  'hover:shadow-blue-500/40',
  'hover:shadow-amber-500/40',
  'hover:shadow-emerald-500/40',
  'hover:shadow-violet-500/40',
  'hover:shadow-rose-500/40',
];

/* ── ripple hook ── */
function useRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const trigger = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  }, []);

  return { ripples, trigger };
}

/* ── intersection observer fade-in ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ── relationship badge ── */
function RelationshipBadge({ rel }: { rel?: RelationshipInfo }) {
  if (!rel) return null;
  const filledStars = Math.min(rel.level, 5);

  const formatLastChat = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 30) return `${days}日前`;
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const lastChat = rel.lastMessageAt ? formatLastChat(rel.lastMessageAt) : null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className={`w-2.5 h-2.5 ${i < filledStars ? 'text-yellow-400' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </span>
      <span className="text-[10px] text-white/50">Lv.{rel.level} {rel.levelName}</span>
      {lastChat && (
        <>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{lastChat}</span>
        </>
      )}
    </div>
  );
}

/* ── character card ── */
function CharacterCard({
  character,
  index,
  onClick,
  relationship,
}: {
  character: Character;
  index: number;
  onClick: () => void;
  relationship?: RelationshipInfo;
}) {
  const { ripples, trigger } = useRipple();
  const { ref, visible } = useFadeIn();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const glow = GLOW_COLORS[index % GLOW_COLORS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const hasCover = !!character.coverUrl;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trigger(e);
    setTimeout(onClick, 200);
  };

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
      }}
    >
      <button
        onClick={handleClick}
        className={`
          relative w-full text-left overflow-hidden rounded-3xl
          border border-white/10
          shadow-lg ${glow}
          hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-0.5
          active:scale-[0.99]
          transition-all duration-300 group bg-gray-900
        `}
      >
        {/* Ripples */}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/25 pointer-events-none animate-ping z-20"
            style={{
              width: 120,
              height: 120,
              left: r.x - 60,
              top: r.y - 60,
              animationDuration: '0.6s',
              animationIterationCount: 1,
            }}
          />
        ))}

        {/* ── Cover image (Instagram-style) ── */}
        {hasCover ? (
          <div className="relative h-28 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.coverUrl!}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Gradient fade to card body */}
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-gray-900`} />
            {/* Franchise badge overlaid on cover */}
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/15 uppercase tracking-wide">
                {character.franchise}
              </span>
            </div>
          </div>
        ) : (
          /* No cover: blurred avatar background */
          <div className="absolute inset-0">
            {character.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.avatarUrl}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(22px) brightness(0.3) saturate(1.5)' }}
              />
            )}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-65`} />
          </div>
        )}

        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
          bg-gradient-to-r from-transparent via-white/6 to-transparent
          -translate-x-full group-hover:translate-x-full
          transition-transform duration-700 ease-in-out pointer-events-none z-10" />

        {/* ── Content ── */}
        <div className={`relative z-10 flex items-end gap-4 px-5 pb-5 ${hasCover ? 'pt-0' : 'pt-5'}`}>
          {/* Avatar ring — overlaps cover when cover exists */}
          <div className={`flex-shrink-0 relative ${hasCover ? '-mt-10' : ''}`}>
            <div className={`w-20 h-20 rounded-2xl overflow-hidden shadow-xl ${hasCover ? 'ring-3 ring-gray-900 ring-offset-0' : 'ring-2 ring-white/30'}`}>
              {character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-bold text-white`}>
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full ring-2 ring-gray-900 animate-pulse" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-xl leading-tight drop-shadow">{character.name}</h3>
            </div>
            {/* Franchise (only show here if no cover image) */}
            {!hasCover && (
              <p className="text-white/60 text-xs mb-2 font-medium tracking-wide uppercase">
                {character.franchise}
              </p>
            )}

            {/* Catchphrase bubble */}
            {catchphrase && (
              <div className="relative inline-block mt-1">
                <div className="bg-white/12 backdrop-blur-sm border border-white/18 rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[200px]">
                  <p className="text-white/85 text-xs leading-relaxed line-clamp-2">
                    &ldquo;{catchphrase}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* 関係性バッジ */}
            <RelationshipBadge rel={relationship} />
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
            group-hover:bg-white/25 transition-colors duration-200 self-end mb-0.5">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

/* ── daily missions / hints ── */
const DAILY_MISSIONS = [
  { id: 'greet', text: 'キャラに挨拶する', xp: 5 },
  { id: 'msg5', text: '5回メッセージを送る', xp: 20 },
  { id: 'question', text: '質問を1つする', xp: 10 },
];

const DAILY_HINTS = [
  '「好きなものは何？」と聞いてみよう',
  '感情豊かに話すと親密度が上がりやすい',
  '毎日話しかけると絆レベルが早く上がるぞ',
  '「音声を再生」でキャラの声が聞けるよ',
  'プロフィールで絆の進捗を確認できる',
];

function DailyMissionsSection({ totalMessages }: { totalMessages: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hintIndex] = useState(() => Math.floor(Math.random() * DAILY_HINTS.length));

  // Simple progress estimates based on total messages
  const completedIds = new Set<string>();
  if (totalMessages >= 1) completedIds.add('greet');
  if (totalMessages >= 5) completedIds.add('msg5');

  return (
    <div className="mb-6">
      {/* ヒントバナー */}
      <div className="flex items-start gap-3 bg-gradient-to-r from-purple-900/40 to-pink-900/30 rounded-2xl border border-purple-500/20 px-4 py-3 mb-3">
        <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-purple-300 font-semibold mb-0.5">今日のヒント</p>
          <p className="text-sm text-gray-300">{DAILY_HINTS[hintIndex]}</p>
        </div>
      </div>

      {/* デイリーミッション */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between bg-gray-900/60 rounded-2xl border border-white/5 px-4 py-3 text-left hover:border-purple-500/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          <span className="text-sm font-semibold text-white">デイリーミッション</span>
          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-0.5">
            {completedIds.size}/{DAILY_MISSIONS.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {DAILY_MISSIONS.map((mission) => {
            const done = completedIds.has(mission.id);
            return (
              <div
                key={mission.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  done
                    ? 'bg-purple-900/20 border-purple-500/25 opacity-70'
                    : 'bg-gray-900/40 border-white/5'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className={`flex-1 text-sm ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {mission.text}
                </span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  done ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
                }`}>
                  {done ? '完了 ✓' : `+${mission.xp}XP`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── welcome banner (first visit) ── */
function WelcomeBanner({ onClose }: { onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('aniva_welcomed');
    if (!seen) setShow(true);
  }, []);

  if (!show) return null;

  const handleClose = () => {
    localStorage.setItem('aniva_welcomed', '1');
    setShow(false);
    onClose();
  };

  return (
    <div className="relative mb-6 rounded-3xl overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 opacity-90" />
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 px-5 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-xl leading-tight mb-1">
              ようこそ、ANIVAへ！
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              あなただけの推しと、毎日リアルに話せる。<br />
              まずは好きなキャラクターを選んでみよう
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white text-lg font-light"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ── */
export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [totalMessages, setTotalMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [, setBannerClosed] = useState(false);
  const [lastVisitMap, setLastVisitMap] = useState<Map<string, number>>(new Map());
  const [charMessages, setCharMessages] = useState<{
    characterId: string; characterName: string; avatarUrl: string | null; message: string; diffH: number; expiresAt: string;
  }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dismissedCharMsgs, setDismissedCharMsgs] = useState<Set<string>>(new Set());
  const [proactiveMessages, setProactiveMessages] = useState<ProactiveMessage[]>([]);
  const [dismissedProactive, setDismissedProactive] = useState<Set<string>>(new Set());

  // Safari bfcache対策: ページ復元時にフルリロード
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // 1秒ごとにnowを更新（カウントダウンタイマー用）
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // localStorageから各キャラの最終訪問時刻を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const map = new Map<string, number>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('aniva_chat_visited_')) {
        const charId = key.replace('aniva_chat_visited_', '');
        const ts = parseInt(localStorage.getItem(key) ?? '0', 10);
        if (ts) map.set(charId, ts);
      }
    }
    setLastVisitMap(map);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const loadChatList = useCallback(async () => {
    if (status === 'loading') return; // まだセッション確認中

    try {
      // Characters (public API)
      const charRes = await fetch('/api/characters');
      if (charRes.ok) {
        const charData = await charRes.json();
        setCharacters(charData.characters || []);
      }
    } catch (err) {
      console.error('[ChatPage] characters fetch error:', err);
    }

    try {
      // Relationships (requires auth)
      const relRes = await fetch('/api/relationship/all');
      if (relRes.ok) {
        const relData = await relRes.json();
        if (relData.relationships) {
          const map = new Map<string, RelationshipInfo>();
          let msgs = 0;
          for (const rel of relData.relationships as RelationshipInfo[]) {
            map.set(rel.characterId, rel);
            msgs += rel.totalMessages;
          }
          setRelationships(map);
          setTotalMessages(msgs);
        }
      } else {
        console.error('[ChatPage] relationship/all failed:', relRes.status, await relRes.text().catch(() => ''));
      }
    } catch (err) {
      console.error('[ChatPage] relationships fetch error:', err);
    }

    try {
      const msgRes = await fetch('/api/character-messages');
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        if (Array.isArray(msgs)) setCharMessages(msgs);
      }
    } catch { /* ignore */ }

    try {
      const proRes = await fetch('/api/proactive-messages');
      if (proRes.ok) {
        const data = await proRes.json();
        if (data.messages) setProactiveMessages(data.messages.filter((m: ProactiveMessage) => !m.isRead));
      }
    } catch { /* ignore */ }

    setIsLoading(false);
  }, [status]);

  // 初回ロード
  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  // ページに戻った時に再フェッチ（新しくチャットしたキャラを反映）
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadChatList();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // ブラウザバック時にも再フェッチ
    window.addEventListener('focus', loadChatList);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', loadChatList);
    };
  }, [loadChatList]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        {/* Header skeleton */}
        <header className="sticky top-0 z-20 bg-gray-950 border-b border-white/5 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-800 animate-pulse" />
            <div className="h-5 w-16 bg-gray-800 rounded-full animate-pulse" />
          </div>
        </header>
        <div className="max-w-lg mx-auto py-2 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950 border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/40">
              A
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">ANIVA</h1>
          </div>
          <div className="text-xs text-white/40 font-mono truncate max-w-[140px]">
            {session?.user?.email}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-32">
        {/* ══ 新着チャット通知バナー ══ */}
        {proactiveMessages.filter(m => !dismissedProactive.has(m.id) && m.character).length > 0 && (
          <div className="mb-4 space-y-2">
            {proactiveMessages.filter(m => !dismissedProactive.has(m.id) && m.character).slice(0, 3).map(msg => (
              <div
                key={msg.id}
                className="bg-gradient-to-r from-purple-900/80 to-pink-900/60 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
                onClick={() => {
                  setDismissedProactive(prev => new Set([...prev, msg.id]));
                  router.push(`/chat/${msg.character?.slug || msg.character?.id}`);
                }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-400/50">
                  {msg.character?.avatarUrl ? (
                    <img src={msg.character.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">{msg.character?.name?.[0] || '?'}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">{msg.character?.name || 'キャラクター'}</p>
                  <p className="text-white/60 text-xs truncate">{msg.message}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">NEW</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* ══ グループチャットバナー ══ */}
        <button
          onClick={() => router.push('/chat/group')}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(88,28,135,0.25), rgba(157,23,77,0.2), rgba(30,27,75,0.15))',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 2px 20px rgba(139,92,246,0.12)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-purple-300 text-[10px] font-black tracking-widest uppercase">グループチャット</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(139,92,246,0.25)', color: 'rgba(196,181,254,0.9)', border: '1px solid rgba(139,92,246,0.3)' }}>NEW</span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">キャラ同士の掛け合いを見よう！</p>
            </div>
            <span className="text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }}>試す →</span>
          </div>
        </button>

        {/* ══ キャラからのメッセージバナー ══ */}
        {charMessages.filter(m => !dismissedCharMsgs.has(m.characterId) && new Date(m.expiresAt).getTime() > now).map(msg => {
          // 各キャラごとに異なる残り時間
          const remainMs = new Date(msg.expiresAt).getTime() - now;
          const remainH = Math.floor(remainMs / 3600000);
          const remainM = Math.floor((remainMs % 3600000) / 60000);
          const remainS = Math.floor((remainMs % 60000) / 1000);
          const countdownStr = remainH > 0
            ? `残り${remainH}時間${remainM}分`
            : remainM > 0
            ? `残り${remainM}分${remainS}秒`
            : `残り${remainS}秒`;
          const isUrgent = remainMs < 3600000; // 1時間未満
          return (
            <div
              key={msg.characterId}
              className="mb-3 bg-gradient-to-r from-purple-900/70 to-pink-900/50 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
              onClick={() => router.push(`/chat/${msg.characterId}`)}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-400/50">
                  {msg.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.avatarUrl} alt={msg.characterName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-700 flex items-center justify-center text-white font-bold">{msg.characterName.charAt(0)}</div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 text-xs">💬</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-300 font-bold mb-0.5">{msg.characterName} からメッセージ</p>
                <p className="text-sm text-white/90 italic truncate">「{msg.message}」</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                <span className={`text-[10px] font-bold font-mono ${isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                  {countdownStr}
                </span>
                <button
                  className="text-gray-500 hover:text-gray-300 text-xs"
                  onClick={e => { e.stopPropagation(); setDismissedCharMsgs(prev => new Set([...prev, msg.characterId])); }}
                >✕</button>
              </div>
            </div>
          );
        })}

        {/* ══ キャラ主導メッセージ（Proactive Messages）バナー ══ */}
        {proactiveMessages.filter(m => !dismissedProactive.has(m.id) && m.character).map(msg => {
          const diffMs = Date.now() - new Date(msg.createdAt).getTime();
          const diffH = Math.floor(diffMs / 3600000);
          const handleClick = async () => {
            // 既読にする
            fetch(`/api/proactive-messages/${msg.id}/read`, { method: 'POST' }).catch(() => {});
            setDismissedProactive(prev => new Set([...prev, msg.id]));
            router.push(`/chat/${msg.character?.id}`);
          };
          return (
            <div
              key={msg.id}
              className="mb-3 bg-gradient-to-r from-indigo-900/70 to-purple-900/50 border border-indigo-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
              onClick={handleClick}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-400/50">
                  {msg.character?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.character.avatarUrl} alt={msg.character?.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-700 flex items-center justify-center text-white font-bold">{msg.character?.name?.charAt(0) || '?'}</div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 text-xs">✨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-300 font-bold mb-0.5">{msg.character?.name || 'キャラクター'} が呼んでいる <span className="text-gray-500 font-normal">({diffH > 0 ? `${diffH}時間前` : 'たった今'})</span></p>
                <p className="text-sm text-white/90 italic truncate">「{msg.message}」</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                <span className="text-[10px] text-pink-400 animate-pulse">NEW</span>
                <button
                  className="text-gray-500 hover:text-gray-300 text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    fetch(`/api/proactive-messages/${msg.id}/read`, { method: 'POST' }).catch(() => {});
                    setDismissedProactive(prev => new Set([...prev, msg.id]));
                  }}
                >✕</button>
              </div>
            </div>
          );
        })}

        {/* チャット一覧 — 会話履歴のあるキャラのみ、最終トーク順 */}
        {(() => {
          // フォロー中 or 会話履歴があるキャラを表示
          // 実効時刻: lastMessageAt と最新プロアクティブメッセージの大きい方
          const getEffectiveTime = (charId: string, rel: RelationshipInfo): number => {
            const msgTime = rel.lastMessageAt ? new Date(rel.lastMessageAt).getTime() : 0;
            const latestProactive = proactiveMessages
              .filter(m => m.character?.id === charId)
              .reduce((max, m) => {
                const t = new Date(m.createdAt).getTime();
                return t > max ? t : max;
              }, 0);
            return Math.max(msgTime, latestProactive);
          };

          const charsWithHistory = characters
            .filter((c) => {
              const rel = relationships.get(c.id);
              return rel && (rel.isFollowing || rel.totalMessages > 0);
            })
            .sort((a, b) => {
              const relA = relationships.get(a.id);
              const relB = relationships.get(b.id);
              // ピン留め優先: isPinned が true のものを先頭に
              const pinnedA = relA?.isPinned ? 1 : 0;
              const pinnedB = relB?.isPinned ? 1 : 0;
              if (pinnedA !== pinnedB) return pinnedB - pinnedA;
              // ピン留め内は pinnedAt 新しい順
              if (pinnedA && pinnedB) {
                const pA = relA?.pinnedAt ? new Date(relA.pinnedAt).getTime() : 0;
                const pB = relB?.pinnedAt ? new Date(relB.pinnedAt).getTime() : 0;
                return pB - pA;
              }
              // ピン留めなし: 実効時刻（lastMessageAt or 最新proactive）の新しい順
              const timeA = relA ? getEffectiveTime(a.id, relA) : 0;
              const timeB = relB ? getEffectiveTime(b.id, relB) : 0;
              return timeB - timeA;
            });

          if (charsWithHistory.length === 0) {
            // フォロー中のキャラ上位3人を表示（なければ全キャラ上位3人）
            const suggestedChars = characters
              .filter(c => relationships.get(c.id)?.isFollowing)
              .slice(0, 3);
            const displayChars = suggestedChars.length > 0 ? suggestedChars : characters.slice(0, 3);
            return (

              <div className="flex flex-col items-center py-16 px-6">
                {/* アイコン */}
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <svg className="w-9 h-9 text-purple-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>

                <h3 className="text-white font-bold text-lg mb-2">キャラと話してみよう</h3>
                <p className="text-gray-400 text-sm leading-relaxed text-center mb-8 max-w-[260px]">
                  好きなキャラクターを選んで、<br />最初の会話を始めてみよう
                </p>

                {/* キャラ候補カード */}
                {displayChars.length > 0 && (
                  <div className="w-full space-y-2.5 mb-8">
                    {displayChars.map((c) => {
                      const state = getDailyState(c.slug ?? c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => router.push(`/chat/${c.slug || c.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full overflow-hidden">
                              {c.avatarUrl ? (
                                <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg font-bold text-white">
                                  {c.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-950" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold truncate">{c.name}</p>
                            <p className="text-gray-500 text-xs truncate">{state.moodEmoji} {state.mood} — {c.franchise}</p>
                          </div>
                          <span className="text-purple-400 text-xs font-semibold flex-shrink-0">話す →</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 探すボタン */}
                <button
                  onClick={() => router.push('/discover')}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                    boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
                  }}
                >
                  もっとキャラを探す
                </button>

              </div>
            );
          }

          return (
            <div className="space-y-1">
              {charsWithHistory.map((character) => {
                const rel = relationships.get(character.id)!;
                const lastVisited = lastVisitMap.get(character.id) ?? 0;
                const lastMsgAt = rel.lastMessageAt ? new Date(rel.lastMessageAt).getTime() : 0;
                const lastMsgIsFromChar = rel.lastMessage?.role !== 'USER';
                const hasUnread = lastMsgIsFromChar && lastMsgAt > lastVisited;
                const charProactiveCount = proactiveMessages.filter(m => m.character?.id === character.id && !dismissedProactive.has(m.id)).length;
                const totalUnread = (hasUnread ? 1 : 0) + charProactiveCount;
                return (
                  <SwipeableChatRow
                    key={character.id}
                    character={character}
                    relationship={rel}
                    hasUnread={hasUnread || charProactiveCount > 0}
                    unreadCount={totalUnread}
                    isPinned={!!rel.isPinned}
                    isMuted={!!rel.isMuted}
                    onClick={() => router.push(`/chat/${character.slug || character.id}`)}
                    onPin={async () => {
                      const newPin = !rel.isPinned;
                      try {
                        const res = await fetch('/api/relationship/pin', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ characterId: character.id, pin: newPin }),
                        });
                        if (res.ok) {
                          setRelationships(prev => {
                            const next = new Map(prev);
                            const updated = { ...rel, isPinned: newPin, pinnedAt: newPin ? new Date().toISOString() : null };
                            next.set(character.id, updated);
                            return next;
                          });
                        }
                      } catch (err) {
                        console.error('[ChatPage] pin error:', err);
                      }
                    }}
                    onMute={async () => {
                      const newMute = !rel.isMuted;
                      try {
                        const res = await fetch('/api/relationship/mute', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ characterId: character.id, mute: newMute }),
                        });
                        if (res.ok) {
                          setRelationships(prev => {
                            const next = new Map(prev);
                            const updated = { ...rel, isMuted: newMute };
                            next.set(character.id, updated);
                            return next;
                          });
                        }
                      } catch (err) {
                        console.error('[ChatPage] mute error:', err);
                      }
                    }}
                    onUnfollow={async () => {
                      try {
                        const res = await fetch(`/api/relationship/${character.id}/follow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ follow: false }),
                        });
                        if (res.ok) {
                          // 一覧から除外（isFollowing = false にして再フェッチ）
                          loadChatList();
                        }
                      } catch (err) {
                        console.error('[ChatPage] unfollow error:', err);
                      }
                    }}
                  />
                );
              })}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
