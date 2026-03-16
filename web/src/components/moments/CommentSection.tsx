'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { MomentComment } from './types';
import { twitterRelTime } from './utils';

/* ────────────────────────────────── CommentAvatar ── */

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
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <Image src={comment.character.avatarUrl} alt={charName ?? ''} width={32} height={32} className="w-full h-full object-cover" unoptimized />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {charName?.charAt(0) ?? '?'}
      </div>
    );
  }
  if (comment.user?.id && userAvatar) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <Image src={userAvatar} alt={displayLabel ?? ''} width={32} height={32} className="w-full h-full object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white/60 text-xs font-bold flex-shrink-0">
      {(displayLabel ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

/* ────────────────────────────────── CommentRow ── */

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
    if (!currentUserId) {
      // セッション未ロード時はAPIに投げてエラーハンドリング
      // (認証チェックはサーバー側で行う)
    }
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
        {comment.characterId ? (
          <a href={`/profile/${comment.character?.slug || comment.characterId}`}>
            <CommentAvatar comment={comment} />
          </a>
        ) : (
          <CommentAvatar comment={comment} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {comment.characterId ? (
            <a href={`/profile/${comment.character?.slug || comment.characterId}`} className="font-bold text-sm text-white leading-tight hover:text-purple-300 transition-colors">{displayName}</a>
          ) : (
            <span className="font-bold text-sm text-white leading-tight">{displayName}</span>
          )}
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
            className="flex items-center gap-1 text-white/30 hover:text-blue-400 transition-colors text-xs"
            onClick={() => onReplyClick(comment.id, displayName)}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v6M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>返信</span>
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

/* ────────────────────────────────── CommentThread ── */

export function CommentThread({
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
  const [threadLiked, setThreadLiked] = useState(comment.userHasLiked ?? false);
  const [threadLikeCount, setThreadLikeCount] = useState(comment.likeCount ?? 0);
  const replies = comment.replies ?? [];
  const AUTO_SHOW = 2;
  const visibleReplies = showAllReplies ? replies : replies.slice(0, AUTO_SHOW);
  const hiddenCount = replies.length - AUTO_SHOW;

  const handleThreadLike = async () => {
    setThreadLiked((prev) => !prev);
    setThreadLikeCount((prev) => threadLiked ? prev - 1 : prev + 1);
    try {
      const res = await fetch(`/api/moments/${momentId}/comments/${comment.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setThreadLiked(data.liked);
        setThreadLikeCount(data.likeCount);
      }
    } catch { /* revert handled by optimistic */ }
  };

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
          {comment.characterId ? (
            <a href={`/profile/${comment.character?.slug || comment.characterId}`}>
              <CommentAvatar comment={comment} />
            </a>
          ) : (
            <CommentAvatar comment={comment} />
          )}
          {replies.length > 0 && <div className="w-px flex-1 bg-white/10 mt-1 min-h-[8px]" />}
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-1 flex-wrap">
            {comment.characterId ? (
              <a href={`/profile/${comment.character?.slug || comment.characterId}`} className="font-bold text-sm text-white leading-tight hover:text-purple-300 transition-colors">{parentDisplayName}</a>
            ) : (
              <span className="font-bold text-sm text-white leading-tight">{parentDisplayName}</span>
            )}
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
            <button
              className={`flex items-center gap-1 transition-colors ${threadLiked ? 'text-red-400' : 'text-white/30 hover:text-red-400'}`}
              onClick={handleThreadLike}
            >
              <svg className="w-3.5 h-3.5" fill={threadLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {threadLikeCount > 0 && <span className="text-xs">{threadLikeCount}</span>}
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
