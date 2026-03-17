'use client';

import { useState, useRef } from 'react';
import { track, EVENTS } from '@/lib/analytics';

// Re-export types and styles for backward compatibility
export type { MomentCharacter, MomentComment, Moment, FloatingHeart } from './types';
export { MOMENT_CARD_STYLES } from './styles';
export { relativeTime, fullDateTime } from './utils';
export { Avatar } from './Avatar';
export { FloatingHearts } from './FloatingHearts';
export { MediaPlaceholder } from './MediaPlaceholder';

import type { Moment, MomentComment, FloatingHeart } from './types';
import { relativeTime, fullDateTime } from './utils';
import { Avatar } from './Avatar';
import { FloatingHearts } from './FloatingHearts';
import { MediaPlaceholder } from './MediaPlaceholder';
import { CommentThread } from './CommentSection';

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
        // フォロー時にウェルカムメッセージ送信
        if (newFollowing) {
          fetch(`/api/relationship/${moment.characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
        }
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
        track(EVENTS.MOMENT_COMMENTED, { momentId: moment.id, characterId: moment.characterId, isReply });
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
        <a href={`/profile/${moment.character.id}`} className="flex-shrink-0">
          <Avatar character={moment.character} ring online />
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a href={`/profile/${moment.character.id}`} className="font-bold text-white text-sm leading-tight hover:text-purple-300 transition-colors">{moment.character.name}</a>
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
      {!moment.isLocked && (moment.visibility === 'PREMIUM' || moment.isFcOnly) && (
        <div className="px-4 mb-2">
          <span className="inline-flex items-center gap-1 bg-purple-500/15 text-purple-300 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
            FC限定
          </span>
        </div>
      )}

      {/* Content */}
      <div className={moment.type === 'IMAGE' && !moment.isLocked ? '' : 'px-4 pb-1'}>
        {moment.isLocked ? (
          moment.isFcOnly || moment.visibility === 'PREMIUM' || moment.visibility === 'STANDARD' ? (
            /* ─── FC限定ロック表示（アクションバーも包含） ─── */
            <div className="flex flex-col items-center gap-3 py-8 pb-6">
              <svg className="w-8 h-8 text-purple-400/80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <span className="text-purple-300 text-xs font-bold tracking-wider">FC限定</span>
              <p className="text-gray-400 text-sm text-center leading-relaxed">
                ファンクラブに入会して<br/>投稿を見る
              </p>
              <a
                href={`/profile/${moment.characterId}?tab=fc&join=1`}
                className="mt-1 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30 active:scale-95"
              >
                {moment.character.name}のFCに入会
              </a>
            </div>
          ) : (
            /* ─── レベルロック表示 ─── */
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
              <p className="text-gray-100 text-sm leading-relaxed mb-3"
                 style={moment.type === 'IMAGE' ? { paddingLeft: '1rem', paddingRight: '1rem' } : undefined}>
                {moment.content}
              </p>
            )}
          </>
        )}
      </div>

      {/* Divider + Actions — FC限定ロック時は非表示（ロックUIに包含） */}
      {!(moment.isLocked && (moment.isFcOnly || moment.visibility === 'PREMIUM' || moment.visibility === 'STANDARD')) && (
        <>
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
        </>
      )}

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
