'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

/* ─── Types ─── */

interface QuotedReply {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id?: string;
    nickname?: string;
    displayName?: string;
    avatarUrl?: string;
    isCharacter?: boolean;
  } | null;
}

interface Reply {
  id: string;
  content: string;
  parentId: string | null;
  quotedReply: QuotedReply | null;
  createdAt: string;
  author: {
    id?: string;
    nickname?: string;
    displayName?: string;
    avatarUrl?: string;
    image?: string;
    isCharacter?: boolean;
  } | null;
  children?: Reply[];
}

interface ThreadDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  viewCount: number;
  createdAt: string;
  author: {
    id?: string;
    nickname?: string;
    displayName?: string;
    avatarUrl?: string;
    image?: string;
    isCharacter?: boolean;
  };
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string;
  };
  replies: Reply[];
}

interface ReplyTarget {
  parentId: string | null;
  quotedReplyId: string | null;
  quotedContent: string | null;
  quotedAuthor: string | null;
}

/* ─── Helpers ─── */

/** 画像URLを検出してimgタグに変換 */
const IMAGE_URL_RE = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?)/gi;

function renderContentWithImages(content: string): React.ReactNode[] {
  const parts = content.split(IMAGE_URL_RE);
  return parts.map((part, i) => {
    if (IMAGE_URL_RE.test(part)) {
      IMAGE_URL_RE.lastIndex = 0; // reset regex state
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={part}
          alt=""
          className="rounded-xl max-w-full my-2 cursor-pointer"
          loading="lazy"
          onClick={() => window.open(part, '_blank')}
        />
      );
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function getAuthorName(author: Reply['author'] | ThreadDetail['author'] | null): string {
  if (!author) return '匿名';
  return author.nickname || author.displayName || '匿名';
}

function buildReplyTree(replies: Reply[]): Reply[] {
  const map = new Map<string, Reply & { children: Reply[] }>();
  const roots: (Reply & { children: Reply[] })[] = [];

  replies.forEach(r => map.set(r.id, { ...r, children: [] }));

  replies.forEach(r => {
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children.push(map.get(r.id)!);
    } else {
      roots.push(map.get(r.id)!);
    }
  });

  return roots;
}

/* ─── QuoteBlock ─── */

function QuoteBlock({ quote }: { quote: QuotedReply }) {
  const authorName = getAuthorName(quote.author);
  return (
    <div className="mb-2 pl-3 border-l-2 border-white/20 bg-white/[0.03] rounded-r-lg py-2 pr-3">
      <p className="text-[11px] text-white/40 mb-0.5">{authorName}</p>
      <p className="text-xs text-white/50 line-clamp-2">{quote.content}</p>
    </div>
  );
}

/* ─── Avatar ─── */

function UserAvatar({ author, size = 20 }: { author: Reply['author'] | null; size?: number }) {
  const name = getAuthorName(author);
  const src = author?.avatarUrl || author?.image;
  const fontSize = size <= 20 ? 9 : 10;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center text-white/40 shrink-0"
      style={{ width: size, height: size, fontSize }}
    >
      {name[0]}
    </div>
  );
}

/* ─── ReplyItem ─── */

function ReplyItem({
  reply,
  isNested = false,
  onReply,
  onQuote,
}: {
  reply: Reply;
  isNested?: boolean;
  onReply: (replyId: string) => void;
  onQuote: (reply: Reply) => void;
}) {
  const router = useRouter();
  const authorName = getAuthorName(reply.author);

  const handleProfileTap = () => {
    if (reply.author?.id && !reply.author?.isCharacter) {
      router.push(`/user/${reply.author.id}`);
    }
  };

  return (
    <div className={`px-4 py-3 ${isNested ? 'pl-4' : ''}`} id={`reply-${reply.id}`}>
      {/* Author Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <button
          onClick={handleProfileTap}
          className="flex items-center gap-2 active:opacity-60 transition-opacity"
          disabled={!reply.author?.id || reply.author?.isCharacter}
        >
          <UserAvatar author={reply.author} size={20} />
          <span className={`text-xs ${reply.author?.isCharacter ? 'text-yellow-400 font-medium' : 'text-white/50'}`}>
            {authorName}
            {reply.author?.isCharacter && (
              <span className="ml-1 text-[9px] bg-yellow-400/20 text-yellow-400/80 px-1 py-0.5 rounded">
                キャラ
              </span>
            )}
          </span>
        </button>
        <span className="text-[10px] text-white/25">{timeAgo(reply.createdAt)}</span>
      </div>

      {/* Quoted Block */}
      {reply.quotedReply && <QuoteBlock quote={reply.quotedReply} />}

      {/* Content */}
      <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed pl-7">
        {renderContentWithImages(reply.content)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pl-7 mt-1.5">
        <button
          onClick={() => onReply(reply.id)}
          className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
        >
          返信
        </button>
        <button
          onClick={() => onQuote(reply)}
          className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
        >
          引用
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function ThreadPage() {
  const { characterSlug, threadId } = useParams<{ characterSlug: string; threadId: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/community/${characterSlug}/${threadId}`);
        if (res.ok) {
          const data = await res.json();
          setThread(data.thread);
        }
      } catch (e) {
        console.error('Failed to fetch thread:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [characterSlug, threadId]);

  const replyTree = useMemo(() => {
    if (!thread) return [];
    return buildReplyTree(thread.replies);
  }, [thread]);

  const handleSetReplyTarget = (replyId: string) => {
    setReplyTarget({
      parentId: replyId,
      quotedReplyId: null,
      quotedContent: null,
      quotedAuthor: null,
    });
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleSetQuoteTarget = (reply: Reply) => {
    setReplyTarget({
      parentId: reply.parentId || reply.id,
      quotedReplyId: reply.id,
      quotedContent: reply.content,
      quotedAuthor: getAuthorName(reply.author),
    });
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleReply = async () => {
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/${characterSlug}/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          parentId: replyTarget?.parentId || null,
          quotedReplyId: replyTarget?.quotedReplyId || null,
        }),
      });
      if (res.ok) {
        setReplyContent('');
        setReplyTarget(null);
        const refetch = await fetch(`/api/community/${characterSlug}/${threadId}`);
        if (refetch.ok) {
          const data = await refetch.json();
          setThread(data.thread);
        }
      }
    } catch (e) {
      console.error('Failed to reply:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleThreadAuthorTap = () => {
    if (thread?.author?.id && !thread?.author?.isCharacter) {
      router.push(`/user/${thread.author.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40">
        スレッドが見つかりません
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-40">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-sm text-white/60">{thread.character.name} 掲示板</span>
        </div>
      </div>

      {/* Thread Content */}
      <div className="px-4 py-4 border-b border-white/5">
        <h1 className="text-lg font-semibold mb-2">{thread.title}</h1>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleThreadAuthorTap}
            className="flex items-center gap-2 active:opacity-60 transition-opacity"
            disabled={!thread.author?.id || thread.author?.isCharacter}
          >
            <UserAvatar author={thread.author} size={24} />
            <span className={`text-xs ${thread.author.isCharacter ? 'text-yellow-400' : 'text-white/50'}`}>
              {getAuthorName(thread.author)}
            </span>
          </button>
          <span className="text-[10px] text-white/30">{timeAgo(thread.createdAt)}</span>
          <span className="text-[10px] text-white/30">{thread.viewCount}回閲覧</span>
        </div>
        <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{renderContentWithImages(thread.content)}</div>
        {/* トップ投稿への返信ボタン */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => {
              setReplyTarget(null);
              inputRef.current?.focus();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v6M3 10l6 6m-6-6l6-6" />
            </svg>
            返信する
          </button>
        </div>
      </div>

      {/* Replies */}
      <div className="px-4 py-2">
        <p className="text-xs text-white/40 mb-2">{thread.replies.length}件の返信</p>
      </div>
      <div>
        {replyTree.map((reply) => (
          <div key={reply.id}>
            <div className="border-b border-white/5">
              <ReplyItem
                reply={reply}
                onReply={handleSetReplyTarget}
                onQuote={handleSetQuoteTarget}
              />
            </div>

            {/* Nested replies (1 level) */}
            {reply.children && reply.children.length > 0 && (
              <div className="ml-8 border-l border-white/5">
                {reply.children.map((child) => (
                  <div key={child.id} className="border-b border-white/[0.03]">
                    <ReplyItem
                      reply={child}
                      isNested
                      onReply={handleSetReplyTarget}
                      onQuote={handleSetQuoteTarget}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {session?.user && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0a0a0a] border-t border-white/5 px-4 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          {/* Quote preview */}
          {replyTarget && replyTarget.quotedContent && (
            <div className="flex items-center gap-2 mb-2 pl-3 border-l-2 border-white/20 bg-white/[0.03] rounded-r-lg py-1.5 pr-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/40">{replyTarget.quotedAuthor}</p>
                <p className="text-[11px] text-white/40 truncate">{replyTarget.quotedContent}</p>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-white/30 hover:text-white/60 p-1 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Reply indicator (no quote) */}
          {replyTarget && !replyTarget.quotedContent && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-white/40">返信先を選択中</span>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-[11px] text-white/30 hover:text-white/60"
              >
                取消
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              type="text"
              placeholder={replyTarget ? '返信を入力...' : 'コメントを入力...'}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              maxLength={2000}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/20"
            />
            <button
              onClick={handleReply}
              disabled={!replyContent.trim() || submitting}
              className="px-4 py-2 bg-white text-black rounded-2xl text-sm font-medium disabled:opacity-30 hover:bg-white/90 active:scale-95 transition-all"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
