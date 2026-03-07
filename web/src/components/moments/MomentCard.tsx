'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
// Link removed — DM button deleted

/* ────────────────────────────────── 型定義 ── */

export interface MomentCharacter {
  name: string;
  avatarUrl: string | null;
}

export interface MomentComment {
  id: string;
  content: string;
  createdAt: string;
  characterId?: string | null;
  userId?: string | null;
  character?: { name: string; slug: string; avatarUrl: string | null } | null;
  user?: { id: string; name: string | null; email: string; displayName?: string | null; nickname?: string | null; image?: string | null } | null;
  parentCommentId?: string | null;
  replies?: MomentComment[];
  likeCount?: number;
  userHasLiked?: boolean;
}

export interface Moment {
  id: string;
  characterId: string;
  character: MomentCharacter;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  visibility: string;
  levelRequired: number;
  publishedAt: string;
  reactionCount: number;
  userHasLiked: boolean;
  isLocked: boolean;
  commentCount?: number;
  isFollowing?: boolean;
}

/* ────────────────────────────────── CSS animations ── */

export const MOMENT_CARD_STYLES = `
  @keyframes floatHeart {
    0%   { transform: translateY(0) scale(1);   opacity: 1; }
    60%  { transform: translateY(-60px) scale(1.3); opacity: 0.9; }
    100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
  }
  @keyframes heartBurst {
    0%   { transform: scale(0.4); opacity: 0; }
    30%  { transform: scale(1.4); opacity: 1; }
    60%  { transform: scale(1.0); opacity: 1; }
    100% { transform: scale(1.2); opacity: 0; }
  }
  @keyframes likePopIn {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.6); }
    60%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  .like-pop { animation: likePopIn 0.4s cubic-bezier(0.22,1,0.36,1); }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  @keyframes quickChatPulse {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.05); }
    70%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  @keyframes bubbleExpand {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.4); }
    65%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  .quick-chat-pulse { animation: quickChatPulse 0.45s cubic-bezier(0.22,1,0.36,1); }
  .quick-chat-bubble { animation: bubbleExpand 0.4s cubic-bezier(0.22,1,0.36,1); }
`;

/* ────────────────────────────────── helpers ── */

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return 'たった今';
}

export function fullDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ────────────────────────────────── Avatar ── */

export function Avatar({
  character,
  size = 'md',
  ring = false,
  online = false,
}: {
  character: MomentCharacter;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
  online?: boolean;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm';
  const ringClass = ring ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : '';

  return (
    <div className={`relative flex-shrink-0 ${sizeClass}`}>
      <div className={`${sizeClass} rounded-full overflow-hidden ${ringClass} relative`}>
        {character.avatarUrl ? (
          <Image src={character.avatarUrl} alt={character.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-gray-900" />
      )}
    </div>
  );
}

/* ────────────────────────────────── FloatingHearts ── */

interface FloatingHeart {
  id: number;
  x: number;
}

export function FloatingHearts({ hearts }: { hearts: FloatingHeart[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute text-red-400 text-lg"
          style={{
            left: h.x,
            bottom: 24,
            animation: 'floatHeart 1.2s ease-out forwards',
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────── Wave heights ── */

const MOMENT_WAVE_HEIGHTS = [20, 35, 50, 65, 45, 70, 55, 30, 60, 80, 45, 65, 35, 55, 75, 40, 60, 50, 70, 35, 55, 65, 45, 30, 55, 70, 40, 25];

/* ────────────────────────────────── MediaPlaceholder ── */

export function MediaPlaceholder({
  type,
  mediaUrl,
  onDoubleTap,
}: {
  type: string;
  mediaUrl: string | null;
  onDoubleTap?: () => void;
}) {
  const [showLikeHeart, setShowLikeHeart] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleTap = () => {
    if (!onDoubleTap) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      onDoubleTap();
      setShowLikeHeart(true);
      setTimeout(() => setShowLikeHeart(false), 900);
    }
    lastTapRef.current = now;
  };

  if (type === 'IMAGE') {
    if (mediaUrl) {
      return (
        <div
          className="relative overflow-hidden mb-3 bg-gray-800 cursor-pointer"
          onClick={handleTap}
        >
            <Image src={mediaUrl} alt="" width={0} height={0} sizes="100vw" className="w-full object-cover" style={{ height: 'auto', maxHeight: 360 }} unoptimized />
          {showLikeHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-6xl"
                style={{
                  animation: 'heartBurst 0.85s ease-out forwards',
                  display: 'inline-block',
                }}
              >
                ❤️
              </span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="overflow-hidden mb-3 bg-gradient-to-br from-gray-800 to-gray-750 flex flex-col items-center justify-center h-44 border-y border-white/5">
        <div className="text-4xl mb-2">🖼️</div>
        <p className="text-white/30 text-xs">画像を準備中…</p>
      </div>
    );
  }

  if (type === 'AUDIO' || type === 'VOICE') {
    return (
      <div className="rounded-2xl mb-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/20 p-4">
        <div className="flex items-center gap-3">
          <button className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0 hover:scale-110 active:scale-95 transition-transform">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <div className="flex items-end gap-0.5 flex-1 h-8">
            {MOMENT_WAVE_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-gradient-to-t from-purple-500 to-pink-400 opacity-70"
                style={{ height: `${h}%`, minHeight: 3 }}
              />
            ))}
          </div>
          <span className="text-white/40 text-xs flex-shrink-0">0:30</span>
        </div>
      </div>
    );
  }

  return null;
}

/* ────────────────────────────────── Comment UI helpers ── */

function twitterRelTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}日`;
  if (hours > 0) return `${hours}時間`;
  if (minutes > 0) return `${minutes}分`;
  return '今';
}

function CommentAvatar({ comment }: { comment: MomentComment }) {
  const charName = comment.character?.name;
  const displayLabel =
    comment.user?.displayName ||
    comment.user?.nickname ||
    comment.user?.name ||
    (comment.user?.email ? comment.user.email.split('@')[0] : null);
  const userAvatar = comment.user?.image;

  if (comment.characterId && comment.character) {
    return comment.character.avatarUrl ? (
      <Image src={comment.character.avatarUrl} alt={charName ?? ''} width={32} height={32} className="rounded-full object-cover flex-shrink-0" unoptimized />
    ) : (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {charName?.charAt(0) ?? '?'}
      </div>
    );
  }
  if (comment.user?.id && userAvatar) {
    return <Image src={userAvatar} alt={displayLabel ?? ''} width={32} height={32} className="rounded-full object-cover flex-shrink-0" unoptimized />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white/60 text-xs font-bold flex-shrink-0">
      {(displayLabel ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

function CommentRow({
  comment,
  momentId,
  currentUserId,
  replyingToId,
  replyToName,
  replyText,
  isSubmittingComment,
  onReplyClick,
  onReplyTextChange,
  onReplySubmit,
  onDelete,
  parentDisplayName,
}: {
  comment: MomentComment;
  momentId: string;
  currentUserId?: string | null;
  replyingToId: string | null;
  replyToName: string;
  replyText: string;
  isSubmittingComment: boolean;
  onReplyClick: (commentId: string, name: string) => void;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: (parentId: string) => void;
  onDelete: (commentId: string) => void;
  parentDisplayName?: string;
}) {
  const [commentLiked, setCommentLiked] = useState(comment.userHasLiked ?? false);
  const [commentLikeCount, setCommentLikeCount] = useState(comment.likeCount ?? 0);

  const handleCommentLike = async () => {
    if (!currentUserId) return;
    // optimistic update
    setCommentLiked((prev) => !prev);
    setCommentLikeCount((prev) => commentLiked ? prev - 1 : prev + 1);
    try {
      const res = await fetch(`/api/moments/${momentId}/comments/${comment.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCommentLiked(data.liked);
        setCommentLikeCount(data.likeCount);
      }
    } catch { /* revert on error handled by optimistic */ }
  };

  const charName = comment.character?.name;
  const displayLabel =
    comment.user?.displayName ||
    comment.user?.nickname ||
    comment.user?.name ||
    (comment.user?.email ? comment.user.email.split('@')[0] : null);
  const displayName = comment.characterId ? (charName ?? 'キャラ') : (displayLabel ?? 'ユーザー');

  return (
    <div className="flex gap-2 py-1">
      <div className="flex-shrink-0">
        <CommentAvatar comment={comment} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-sm text-white leading-tight">{displayName}</span>
          {comment.characterId && (
            <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
          <span className="text-white/40 text-xs">· {twitterRelTime(comment.createdAt)}</span>
          {currentUserId && comment.userId === currentUserId && (
            <button
              className="ml-auto text-white/20 hover:text-red-400 transition-colors p-0.5"
              title="削除"
              onClick={() => onDelete(comment.id)}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {parentDisplayName && (
          <span className="text-xs text-blue-400/70">@{parentDisplayName} </span>
        )}
        <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-line mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-4 mt-1.5">
          <button
            className="flex items-center gap-1 text-white/30 hover:text-blue-400 transition-colors"
            onClick={() => onReplyClick(comment.id, displayName)}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button
            className={`flex items-center gap-1 transition-colors ${commentLiked ? 'text-red-400' : 'text-white/30 hover:text-red-400'}`}
            onClick={handleCommentLike}
          >
            <svg className="w-3.5 h-3.5" fill={commentLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {commentLikeCount > 0 && <span className="text-xs">{commentLikeCount}</span>}
          </button>
        </div>
        {replyingToId === comment.id && (
          <div className="mt-2 flex items-start gap-2">
            <textarea
              value={replyText}
              onChange={(e) => {
                onReplyTextChange(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
              }}
              placeholder={`@${replyToName} に返信...`}
              rows={1}
              style={{ fontSize: '16px', resize: 'none' }}
              className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 transition-colors"
              autoFocus
            />
            <button
              className="mt-0.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-full disabled:opacity-30 transition-colors flex-shrink-0"
              disabled={!replyText.trim() || isSubmittingComment}
              onClick={() => onReplySubmit(comment.id)}
            >
              返信
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  momentId,
  currentUserId,
  replyingToId,
  replyToName,
  replyText,
  isSubmittingComment,
  onReplyClick,
  onReplyTextChange,
  onReplySubmit,
  onDelete,
}: {
  comment: MomentComment;
  momentId: string;
  currentUserId?: string | null;
  replyingToId: string | null;
  replyToName: string;
  replyText: string;
  isSubmittingComment: boolean;
  onReplyClick: (commentId: string, name: string) => void;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: (parentId: string) => void;
  onDelete: (commentId: string) => void;
}) {
  const [showAllReplies, setShowAllReplies] = useState(false);
  const replies = comment.replies ?? [];
  const AUTO_SHOW = 2;
  const visibleReplies = showAllReplies ? replies : replies.slice(0, AUTO_SHOW);
  const hiddenCount = replies.length - AUTO_SHOW;

  const charName = comment.character?.name;
  const displayLabel =
    comment.user?.displayName ||
    comment.user?.nickname ||
    comment.user?.name ||
    (comment.user?.email ? comment.user.email.split('@')[0] : null);
  const parentDisplayName = comment.characterId ? (charName ?? 'キャラ') : (displayLabel ?? 'ユーザー');

  return (
    <div className="py-1">
      {/* Top-level comment row */}
      <div className="flex gap-2">
        {/* Avatar + thread line */}
        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
          <CommentAvatar comment={comment} />
          {replies.length > 0 && <div className="w-px flex-1 bg-white/10 mt-1 min-h-[8px]" />}
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-sm text-white leading-tight">{parentDisplayName}</span>
            {comment.characterId && (
              <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
            <span className="text-white/40 text-xs">· {twitterRelTime(comment.createdAt)}</span>
            {currentUserId && comment.userId === currentUserId && (
              <button
                className="ml-auto text-white/20 hover:text-red-400 transition-colors p-0.5"
                title="削除"
                onClick={() => onDelete(comment.id)}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-line mt-0.5">{comment.content}</p>
          <div className="flex items-center gap-4 mt-1.5">
            <button
              className="flex items-center gap-1 text-white/30 hover:text-blue-400 transition-colors"
              onClick={() => onReplyClick(comment.id, parentDisplayName)}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {replies.length > 0 && <span className="text-xs">{replies.length}</span>}
            </button>
            <button className="flex items-center gap-1 text-white/30 hover:text-red-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          {replyingToId === comment.id && (
            <div className="mt-2 flex items-start gap-2">
              <textarea
                value={replyText}
                onChange={(e) => {
                  onReplyTextChange(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                }}
                placeholder={`@${replyToName} に返信...`}
                rows={1}
                style={{ fontSize: '16px', resize: 'none' }}
                className="flex-1 bg-transparent border-b border-white/20 px-1 py-1 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 transition-colors"
                autoFocus
              />
              <button
                className="mt-0.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-full disabled:opacity-30 transition-colors flex-shrink-0"
                disabled={!replyText.trim() || isSubmittingComment}
                onClick={() => onReplySubmit(comment.id)}
              >
                返信
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-10 mt-1 space-y-0.5">
          {visibleReplies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              momentId={momentId}
              currentUserId={currentUserId}
              replyingToId={replyingToId}
              replyToName={replyToName}
              replyText={replyText}
              isSubmittingComment={isSubmittingComment}
              onReplyClick={onReplyClick}
              onReplyTextChange={onReplyTextChange}
              onReplySubmit={onReplySubmit}
              onDelete={onDelete}
              parentDisplayName={parentDisplayName}
            />
          ))}
          {!showAllReplies && hiddenCount > 0 && (
            <button
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1 ml-1 py-0.5"
              onClick={() => setShowAllReplies(true)}
            >
              返信を{hiddenCount}件表示
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────── MomentCard ── */

export function MomentCard({
  moment,
  onLike,
  currentUserId,
  showFollowButton,
  isFollowing: isFollowingProp,
  onFollowChange,
  showQuickChat,
  onQuickChat,
}: {
  moment: Moment;
  onLike: (id: string) => void;
  currentUserId?: string | null;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollowChange?: (characterId: string, following: boolean) => void;
  showQuickChat?: boolean;
  onQuickChat?: (characterId: string, content: string, isFollowing: boolean) => void;
}) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [bouncing, setBouncing] = useState(false);
  const [expandedComments, setExpandedComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  // 返信UI state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  // フォロー状態（propsで初期化、ローカルで管理）
  const [followState, setFollowState] = useState<boolean>(isFollowingProp ?? moment.isFollowing ?? false);
  const [followLoading, setFollowLoading] = useState(false);
  const [quickChatPressed, setQuickChatPressed] = useState(false);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const newFollowing = !followState;
    try {
      const res = await fetch(`/api/relationship/${moment.characterId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: newFollowing }),
      });
      if (res.ok) {
        setFollowState(newFollowing);
        onFollowChange?.(moment.characterId, newFollowing);
      }
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  };

  async function fetchComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/moments/${moment.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        // API returns likedByMe, map to userHasLiked for frontend
        const mapComment = (c: MomentComment & { likedByMe?: boolean }): MomentComment => ({
          ...c,
          userHasLiked: c.likedByMe ?? c.userHasLiked ?? false,
          replies: (c.replies ?? []).map((r) => mapComment(r as MomentComment & { likedByMe?: boolean })),
        });
        setComments((data.comments ?? []).map(mapComment));
      }
    } catch { /* ignore */ } finally {
      setLoadingComments(false);
    }
  }

  // コメント投稿後のライブポーリング（キャラ返信を5秒×3回チェック）
  async function pollForCharacterReplies(times: number) {
    // キャラ返信は3〜8秒後に来る。5秒後に初回チェック、以降10秒間隔
    const delays = [5000, 10000, 10000, 15000, 15000];
    for (let i = 0; i < times; i++) {
      await new Promise((resolve) => setTimeout(resolve, delays[i] ?? 10000));
      await fetchComments();
    }
  }

  async function submitComment(parentCommentId?: string | null) {
    const isReply = !!parentCommentId;
    const text = (isReply ? replyText : commentText).trim();
    if (!text || isSubmittingComment) return;
    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/moments/${moment.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, parentCommentId: parentCommentId ?? null }),
      });
      if (res.ok) {
        if (isReply) {
          setReplyText('');
          setReplyingToId(null);
        } else {
          setCommentText('');
        }
        fetchComments();
        // キャラが返信してくれる可能性があるので5秒×3回ポーリング
        pollForCharacterReplies(5);
        // デイリーミッション: moment_comment 自動完了（1セッション1回）
        if (!isReply && !sessionStorage.getItem('mission_triggered_moment_comment')) {
          sessionStorage.setItem('mission_triggered_moment_comment', '1');
          fetch('/api/missions/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: 'moment_comment' }),
          }).catch(() => {/* ignore */});
        }
      } else if (res.status === 401) {
        setCommentError('ログインが必要です');
      } else {
        setCommentError('送信に失敗しました');
      }
    } catch {
      setCommentError('送信に失敗しました');
    } finally {
      setIsSubmittingComment(false);
    }
  }
  const likeRef = useRef<HTMLButtonElement>(null);

  const handleLike = () => {
    onLike(moment.id);
    const newHeart: FloatingHeart = {
      id: Date.now(),
      x: Math.random() * 40 - 10,
    };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== newHeart.id)), 1300);
    setBouncing(true);
    setTimeout(() => setBouncing(false), 400);
  };

  return (
    <div className="bg-gray-900/70 backdrop-blur-sm border border-white/6 rounded-3xl overflow-hidden shadow-lg hover:border-white/12 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar character={moment.character} ring online />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm leading-tight">{moment.character.name}</p>
            {showFollowButton && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all flex-shrink-0 ${
                  followState
                    ? 'bg-gray-700/60 text-white/50 border border-white/10'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-900/30'
                } disabled:opacity-50`}
              >
                {followLoading ? '…' : followState ? 'フォロー中' : 'フォローする'}
              </button>
            )}
          </div>
          <p className="text-white/40 text-xs" title={fullDateTime(moment.publishedAt)}>
            {relativeTime(moment.publishedAt)}
          </p>
        </div>
        <button
          className="text-white/30 hover:text-white/60 transition-colors px-1"
          onClick={() => {
            if (confirm('この投稿を報告しますか？')) {
              alert('報告を受け付けました。確認いたします。');
            }
          }}
          aria-label="報告"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Visibility badge */}
      {!moment.isLocked && moment.visibility === 'STANDARD' && (
        <div className="px-4 mb-2">
          <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20">
            ⭐ STANDARDメンバー限定
          </span>
        </div>
      )}
      {!moment.isLocked && moment.visibility === 'PREMIUM' && (
        <div className="px-4 mb-2">
          <span className="inline-flex items-center gap-1 bg-yellow-500/15 text-yellow-300 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20">
            👑 PREMIUMメンバー限定
          </span>
        </div>
      )}

      {/* Content */}
      <div className={moment.type === 'IMAGE' && !moment.isLocked ? '' : 'px-4 pb-1'}>
        {moment.isLocked ? (
          moment.visibility === 'PREMIUM' || moment.visibility === 'STANDARD' ? (
            <div className="relative bg-gray-900/60 rounded-xl p-4 border border-purple-900/30 overflow-hidden mb-3">
              {/* ぼかし背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm" />
              <div className="relative z-10 flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-xs font-bold uppercase tracking-wider">FC限定</span>
                </div>
                <p className="text-gray-400 text-sm text-center">ファンクラブ会員だけが見れる<br/>特別なMoment</p>
                <a
                  href={`/profile/${moment.characterId}#fc`}
                  className="mt-1 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30"
                >
                  💜 {moment.character.name}のFC会員になる
                </a>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden mb-3">
              <p className="text-gray-300 text-sm leading-relaxed blur-sm select-none py-2">
                ロックされたコンテンツです。レベルを上げることで解放されます。もう少し頑張ってみてください！
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-[2px]">
                <div className="bg-gray-900/90 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="text-white text-xs font-semibold">まだ見られません</p>
                    <p className="text-white/50 text-[10px]">レベル {moment.levelRequired} 以上で解放</p>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            {(moment.type === 'IMAGE' || moment.type === 'AUDIO' || moment.type === 'VOICE') && (
              <MediaPlaceholder
                type={moment.type}
                mediaUrl={moment.mediaUrl}
                onDoubleTap={() => onLike(moment.id)}
              />
            )}
            {moment.content && (
              <p className={`text-gray-100 text-sm leading-relaxed mb-3 ${moment.type === 'IMAGE' ? 'px-4' : ''}`}>
                {moment.content}
              </p>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-4" />

      {/* Actions */}
      <div className="relative flex items-center justify-between px-4 py-3">
        <FloatingHearts hearts={hearts} />

        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            ref={likeRef}
            onClick={handleLike}
            className="flex items-center gap-1.5 group"
            aria-label="いいね"
          >
            <span
              key={String(moment.userHasLiked)}
              className={`text-xl inline-block ${bouncing ? 'like-pop' : ''}`}
            >
              {moment.userHasLiked ? '❤️' : '🤍'}
            </span>
            <span className={`text-sm font-semibold transition-colors ${moment.userHasLiked ? 'text-red-400' : 'text-white/40 group-hover:text-white/60'}`}>
              {moment.reactionCount > 0 ? moment.reactionCount.toLocaleString() : ''}
            </span>
          </button>

          {/* Comment */}
          <button
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
            onClick={() => {
              setExpandedComments((prev) => {
                if (!prev) fetchComments();
                return !prev;
              });
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">コメント{(moment.commentCount ?? 0) > 0 ? ` ${moment.commentCount}` : ''}</span>
          </button>

          {/* DM — 削除済み（BottomNavチャットに集約） */}
        </div>

        {/* Share */}
        <button
          className="text-white/30 hover:text-white/60 transition-colors"
          onClick={() => {
            const url = `${window.location.origin}/moments/${moment.id}`;
            if (navigator.share) {
              navigator.share({ title: `${moment.character.name}の投稿`, url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(url).then(() => {
                alert('リンクをコピーしました');
              }).catch(() => {});
            }
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        </button>
      </div>

      {/* Quick Chat CTA — おすすめタブのみ表示 */}
      {showQuickChat && !moment.isLocked && (
        <div className="px-4 pb-3 pt-1">
          <button
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-pink-500 transition-all active:scale-[0.97] ${quickChatPressed ? 'quick-chat-pulse' : ''}`}
            onClick={() => {
              setQuickChatPressed(true);
              setTimeout(() => setQuickChatPressed(false), 450);
              onQuickChat?.(moment.characterId, moment.content ?? '', followState);
            }}
          >
            <svg
              className={`w-4 h-4 flex-shrink-0 ${quickChatPressed ? 'quick-chat-bubble' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{followState ? 'この話題で話す' : '話しかける'}</span>
          </button>
        </div>
      )}

      {/* コメント展開エリア */}
      {expandedComments && (
        <div className="border-t border-white/5">
          {/* コメント一覧 */}
          {loadingComments ? (
            <div className="px-4 py-4 text-white/30 text-xs text-center">読み込み中...</div>
          ) : comments.length === 0 ? (
            <div className="px-4 py-4 text-white/30 text-xs text-center">まだコメントはありません</div>
          ) : (
            <div className="px-4 pt-2 divide-y divide-white/5">
              {comments.map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  momentId={moment.id}
                  currentUserId={currentUserId}
                  replyingToId={replyingToId}
                  replyToName={replyToName}
                  replyText={replyText}
                  isSubmittingComment={isSubmittingComment}
                  onReplyClick={(commentId, name) => {
                    if (replyingToId === commentId) {
                      setReplyingToId(null);
                    } else {
                      setReplyingToId(commentId);
                      setReplyToName(name);
                      setReplyText('');
                    }
                  }}
                  onReplyTextChange={setReplyText}
                  onReplySubmit={(parentId) => submitComment(parentId)}
                  onDelete={async (commentId) => {
                    const res = await fetch(`/api/moments/${moment.id}/comments/${commentId}`, { method: 'DELETE' });
                    if (res.ok) {
                      setComments((prev) =>
                        prev
                          .filter((x) => x.id !== commentId)
                          .map((x) => ({ ...x, replies: x.replies?.filter((r) => r.id !== commentId) }))
                      );
                    }
                  }}
                />
              ))}
            </div>
          )}
          {/* 新規コメント入力 — Twitterスタイル */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center gap-3">
            <textarea
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="返信をポスト..."
              rows={1}
              style={{ fontSize: '16px', resize: 'none' }}
              className="flex-1 bg-transparent border-b border-white/15 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
            <button
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-full disabled:opacity-30 transition-colors flex-shrink-0"
              disabled={!commentText.trim() || isSubmittingComment}
              onClick={() => submitComment()}
            >
              返信
            </button>
          </div>
          {commentError && <p className="text-red-400 text-xs text-center pb-2">{commentError}</p>}
        </div>
      )}
    </div>
  );
}

export default MomentCard;
