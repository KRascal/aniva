'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

/* ────────────────────────────────── 型定義 ── */

export interface MomentCharacter {
  name: string;
  avatarUrl: string | null;
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
      <div className={`${sizeClass} rounded-full overflow-hidden ${ringClass}`}>
        {character.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl} alt="" className="w-full object-cover" style={{ maxHeight: 360 }} />
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

/* ────────────────────────────────── MomentCard ── */

export function MomentCard({
  moment,
  onLike,
}: {
  moment: Moment;
  onLike: (id: string) => void;
}) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [bouncing, setBouncing] = useState(false);
  const [expandedComments, setExpandedComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function submitComment() {
    const text = commentText.trim();
    if (!text || isSubmittingComment) return;
    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/moments/${moment.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setCommentText('');
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
          <p className="font-bold text-white text-sm leading-tight">{moment.character.name}</p>
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
            onClick={() => setExpandedComments((prev) => !prev)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">コメント</span>
          </button>

          {/* DM */}
          <Link
            href={`/chat/${moment.characterId}`}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">DM</span>
          </Link>
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

      {/* コメント展開エリア */}
      {expandedComments && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`${moment.character.name}の投稿にコメント...`}
              className="flex-1 bg-gray-800/60 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitComment();
              }}
            />
            <button
              className="p-2 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-30"
              disabled={!commentText.trim() || isSubmittingComment}
              onClick={submitComment}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          {commentError && <p className="text-red-400 text-xs text-center">{commentError}</p>}
        </div>
      )}
    </div>
  );
}

export default MomentCard;
