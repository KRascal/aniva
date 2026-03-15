'use client';

import { useCallback, useEffect, useState } from 'react';

interface FanThread {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  character: { id: string; name: string; avatarUrl: string | null };
  user: { id: string; displayName: string | null; nickname: string | null } | null;
  _count: { replies: number };
}

interface FanReply {
  id: string;
  content: string;
  createdAt: string;
  thread: { id: string; title: string };
  user: { id: string; displayName: string | null; nickname: string | null } | null;
  character: { id: string; name: string; avatarUrl: string | null } | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  general: '一般',
  discussion: '議論',
  fanart: 'ファンアート',
  question: '質問',
  event: 'イベント',
};

export default function CommunityPage() {
  const [type, setType] = useState<'thread' | 'reply'>('thread');
  const [threads, setThreads] = useState<FanThread[]>([]);
  const [replies, setReplies] = useState<FanReply[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reportedOnly, setReportedOnly] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: 'thread' | 'reply'; title: string } | null>(null);

  const load = useCallback(async (p = 1, t = type, ro = reportedOnly) => {
    setLoading(true);
    const params = new URLSearchParams({ type: t, page: String(p), limit: '50' });
    if (ro) params.set('reportedOnly', 'true');
    const res = await fetch(`/api/admin/community?${params}`);
    const data = await res.json();
    if (t === 'thread') {
      setThreads(data.threads || []);
    } else {
      setReplies(data.replies || []);
    }
    setTotal(data.pagination?.total || 0);
    setTotalPages(data.pagination?.totalPages || 1);
    setLoading(false);
  }, [type, reportedOnly]);

  useEffect(() => { load(page); }, [page, type, reportedOnly, load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      const res = await fetch('/api/admin/community', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id, type: confirmDelete.type }),
      });
      if (res.ok) {
        if (confirmDelete.type === 'thread') {
          setThreads((prev) => prev.filter((t) => t.id !== confirmDelete.id));
        } else {
          setReplies((prev) => prev.filter((r) => r.id !== confirmDelete.id));
        }
        setTotal((t) => t - 1);
      }
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handlePin = async (threadId: string, isPinned: boolean) => {
    setPinning(threadId);
    try {
      const res = await fetch('/api/admin/community', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: threadId, isPinned: !isPinned }),
      });
      if (res.ok) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isPinned: !isPinned } : t))
        );
      }
    } finally {
      setPinning(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">コミュニティ管理</h1>
      </div>
      <p className="text-sm text-neutral-400 mb-6">合計 {total} 件</p>

      {/* タブ + フィルター */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex rounded overflow-hidden border border-neutral-700">
          {(['thread', 'reply'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-4 py-2 text-sm transition-colors ${
                type === t ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {t === 'thread' ? 'スレッド' : 'リプライ'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={reportedOnly}
            onChange={(e) => { setReportedOnly(e.target.checked); setPage(1); }}
            className="accent-yellow-500 w-4 h-4"
          />
          <span className="text-sm text-neutral-400">通報フラグ付きのみ</span>
        </label>
      </div>

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-white font-semibold">削除の確認</h3>
            <p className="text-sm text-neutral-400">
              この{confirmDelete.type === 'thread' ? 'スレッド' : 'リプライ'}を削除しますか？この操作は取り消せません。
            </p>
            <p className="text-xs text-neutral-500 font-mono break-all bg-neutral-800 p-2 rounded">{confirmDelete.title}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 text-white rounded transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={!!deleting}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : type === 'thread' ? (
        <div className="space-y-3">
          {threads.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">スレッドがありません</div>
          ) : (
            threads.map((thread) => (
              <div key={thread.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {thread.isPinned && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 border border-yellow-800 rounded">📌 ピン留め</span>
                      )}
                      {thread.isLocked && (
                        <span className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-500 border border-neutral-700 rounded">🔒 ロック</span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                        {CATEGORY_LABEL[thread.category] ?? thread.category}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm truncate">{thread.title}</p>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{thread.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600">
                      <span>キャラ: {thread.character.name}</span>
                      <span>|</span>
                      <span>投稿者: {thread.user?.displayName || thread.user?.nickname || 'システム'}</span>
                      <span>|</span>
                      <span>👁 {thread.viewCount}</span>
                      <span>💬 {thread._count.replies}</span>
                      <span>|</span>
                      <span>{new Date(thread.createdAt).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handlePin(thread.id, thread.isPinned)}
                      disabled={pinning === thread.id}
                      className={`px-3 py-1.5 text-xs rounded transition-colors disabled:opacity-50 ${
                        thread.isPinned
                          ? 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900 border border-yellow-800'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {thread.isPinned ? '📌 解除' : '📌 ピン'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: thread.id, type: 'thread', title: thread.title })}
                      className="px-3 py-1.5 text-xs bg-neutral-800 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {replies.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">リプライがありません</div>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500 mb-1">
                      スレッド: <span className="text-neutral-400">{reply.thread.title}</span>
                    </p>
                    <p className="text-sm text-white line-clamp-3">{reply.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600">
                      <span>投稿者: {reply.user?.displayName || reply.user?.nickname || reply.character?.name || '不明'}</span>
                      <span>|</span>
                      <span>{new Date(reply.createdAt).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete({ id: reply.id, type: 'reply', title: reply.content.slice(0, 50) })}
                    className="px-3 py-1.5 text-xs bg-neutral-800 text-red-400 hover:bg-red-900/30 rounded transition-colors shrink-0"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded disabled:opacity-40 transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-neutral-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded disabled:opacity-40 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
