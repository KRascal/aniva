'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: {
    nickname?: string;
    displayName?: string;
    avatarUrl?: string;
    image?: string;
    isCharacter?: boolean;
  } | null;
}

interface ThreadDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  viewCount: number;
  createdAt: string;
  author: {
    nickname?: string;
    displayName?: string;
    avatarUrl?: string;
    image?: string;
    isCharacter?: boolean;
  };
  character: {
    name: string;
    slug: string;
    avatarUrl: string;
  };
  replies: Reply[];
}

export default function ThreadPage() {
  const { characterSlug, threadId } = useParams<{ characterSlug: string; threadId: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleReply = async () => {
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/${characterSlug}/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });
      if (res.ok) {
        setReplyContent('');
        // Refetch thread
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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'たった今';
    if (mins < 60) return `${mins}分前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
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
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32">
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
          {thread.author.avatarUrl || thread.author.image ? (
            <img
              src={thread.author.avatarUrl || thread.author.image || ''}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/40">
              {(thread.author.nickname || '?')[0]}
            </div>
          )}
          <span className={`text-xs ${thread.author.isCharacter ? 'text-yellow-400' : 'text-white/50'}`}>
            {thread.author.nickname || thread.author.displayName || '匿名'}
          </span>
          <span className="text-[10px] text-white/30">{timeAgo(thread.createdAt)}</span>
          <span className="text-[10px] text-white/30">{thread.viewCount}回閲覧</span>
        </div>
        <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{thread.content}</p>
      </div>

      {/* Replies */}
      <div className="px-4 py-2">
        <p className="text-xs text-white/40 mb-2">{thread.replies.length}件の返信</p>
      </div>
      <div className="divide-y divide-white/5">
        {thread.replies.map((reply) => (
          <div key={reply.id} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              {(reply.author?.avatarUrl || reply.author?.image) ? (
                <img
                  src={reply.author.avatarUrl || reply.author.image || ''}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/40">
                  {(reply.author?.nickname || '?')[0]}
                </div>
              )}
              <span className={`text-xs ${reply.author?.isCharacter ? 'text-yellow-400 font-medium' : 'text-white/50'}`}>
                {reply.author?.nickname || reply.author?.displayName || '匿名'}
                {reply.author?.isCharacter && (
                  <span className="ml-1 text-[9px] bg-yellow-400/20 text-yellow-400/80 px-1 py-0.5 rounded">
                    キャラ
                  </span>
                )}
              </span>
              <span className="text-[10px] text-white/25">{timeAgo(reply.createdAt)}</span>
            </div>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed pl-7">
              {reply.content}
            </p>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {session?.user && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/5 px-4 py-3 pb-safe">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="返信を入力..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              maxLength={2000}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
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
