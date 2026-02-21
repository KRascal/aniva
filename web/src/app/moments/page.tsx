'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface MomentCharacter {
  name: string;
  avatarUrl: string | null;
}

interface Moment {
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

function relativeTime(dateStr: string): string {
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

function Avatar({ character }: { character: MomentCharacter }) {
  if (character.avatarUrl) {
    return (
      <img
        src={character.avatarUrl}
        alt={character.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
      {character.name.charAt(0)}
    </div>
  );
}

function MomentCard({
  moment,
  onLike,
}: {
  moment: Moment;
  onLike: (id: string) => void;
}) {
  return (
    <div className="bg-gray-800/60 hover:bg-gray-800/80 transition-colors rounded-2xl p-4 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar character={moment.character} />
        <div>
          <p className="font-semibold text-white text-sm">{moment.character.name}</p>
          <p className="text-gray-400 text-xs">{relativeTime(moment.publishedAt)}</p>
        </div>
      </div>

      {/* Content */}
      {moment.isLocked ? (
        <div className="relative mb-3">
          <p className="text-gray-300 text-sm leading-relaxed blur-sm select-none">
            ロックされたコンテンツです。レベルを上げて解放しましょう！
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-gray-900/80 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <span className="text-white text-xs font-medium">
                レベル{moment.levelRequired}以上で解放
              </span>
            </div>
          </div>
        </div>
      ) : (
        moment.content && (
          <p className="text-gray-200 text-sm leading-relaxed mb-3">{moment.content}</p>
        )
      )}

      {/* Visibility badge */}
      {moment.visibility === 'STANDARD' && !moment.isLocked && (
        <span className="inline-block bg-blue-600/30 text-blue-300 text-xs px-2 py-0.5 rounded-full mb-3">
          STANDARDメンバー限定
        </span>
      )}
      {moment.visibility === 'PREMIUM' && !moment.isLocked && (
        <span className="inline-block bg-yellow-600/30 text-yellow-300 text-xs px-2 py-0.5 rounded-full mb-3">
          PREMIUMメンバー限定
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => onLike(moment.id)}
          className="flex items-center gap-1.5 text-sm transition-transform active:scale-110"
        >
          <span className={moment.userHasLiked ? 'text-red-400' : 'text-gray-400'}>
            {moment.userHasLiked ? '❤️' : '🤍'}
          </span>
          <span className="text-gray-400">{moment.reactionCount}</span>
        </button>

        <Link
          href={`/chat/${moment.characterId}`}
          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>💬</span>
          <span>チャットで話す</span>
        </Link>
      </div>
    </div>
  );
}

export default function MomentsPage() {
  const { data: session } = useSession();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  const fetchMoments = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`/api/moments?${params}`);
    if (!res.ok) return null;
    return res.json() as Promise<{ moments: Moment[]; nextCursor: string | null }>;
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMoments().then((data) => {
      if (data) {
        setMoments(data.moments);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchMoments]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchMoments(nextCursor);
    if (data) {
      setMoments((prev) => [...prev, ...data.moments]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  };

  const handleLike = async (momentId: string) => {
    if (!session?.user) return;

    // Optimistic update
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const liked = !m.userHasLiked;
        return {
          ...m,
          userHasLiked: liked,
          reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1,
        };
      })
    );

    try {
      const res = await fetch(`/api/moments/${momentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like' }),
      });
      if (res.ok) {
        const { liked, reactionCount } = await res.json();
        // Sync with server
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId ? { ...m, userHasLiked: liked, reactionCount } : m
          )
        );
      }
    } catch {
      // Revert optimistic update on error
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          const liked = !m.userHasLiked;
          return {
            ...m,
            userHasLiked: liked,
            reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1,
          };
        })
      );
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const res = await fetch('/api/moments/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(`✅ ${data.message}`);
        // Reload moments
        const fresh = await fetchMoments();
        if (fresh) {
          setMoments(fresh.moments);
          setNextCursor(fresh.nextCursor);
        }
      } else {
        setSeedMessage(`❌ ${data.error}`);
      }
    } catch {
      setSeedMessage('❌ エラーが発生しました');
    }
    setSeeding(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">タイムライン</h1>
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              💬 チャット
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* DEV seed banner */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="bg-gray-800 border border-yellow-600/40 rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-yellow-400 text-xs">🔧 開発モード</span>
            <div className="flex items-center gap-2">
              {seedMessage && (
                <span className="text-xs text-gray-300">{seedMessage}</span>
              )}
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="text-xs bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {seeding ? '投入中...' : '🔧 DEV: サンプルデータ投入'}
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-sm">読み込み中...</p>
          </div>
        ) : moments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">まだ投稿がありません</p>
            <p className="text-xs mt-1 text-gray-500">
              開発中バナーの「サンプルデータ投入」を試してみてください
            </p>
          </div>
        ) : (
          <>
            {moments.map((moment) => (
              <MomentCard key={moment.id} moment={moment} onLike={handleLike} />
            ))}

            {nextCursor && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-2xl transition-colors disabled:opacity-50"
              >
                {loadingMore ? '読み込み中...' : 'もっと見る'}
              </button>
            )}
          </>
        )}
      </main>

      {/* Bottom padding for mobile */}
      <div className="h-8" />
    </div>
  );
}
