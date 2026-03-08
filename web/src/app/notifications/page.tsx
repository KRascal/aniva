'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  actorName?: string;
  actorAvatar?: string;
  targetUrl?: string;
  momentId?: string;
  characterId?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  character_reply:    { icon: '💬', color: 'text-purple-400',  label: '返信' },
  CHARACTER_MESSAGE:  { icon: '💌', color: 'text-pink-400',    label: 'メッセージ' },
  character_comment:  { icon: '✨', color: 'text-pink-400',    label: 'コメント' },
  moment_like:        { icon: '❤️', color: 'text-red-400',     label: 'いいね' },
  moment_comment:     { icon: '💭', color: 'text-blue-400',    label: 'コメント' },
  follow:             { icon: '👤', color: 'text-emerald-400', label: 'フォロー' },
  MILESTONE:          { icon: '💎', color: 'text-amber-400',   label: '思い出' },
  DAILY_BONUS:        { icon: '🎁', color: 'text-yellow-400',  label: 'デイリー' },
  SYSTEM:             { icon: '🔔', color: 'text-gray-400',    label: 'システム' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifs();
    // ページ表示時に全件既読にする
    fetch('/api/notifications', { method: 'POST' }).catch(() => {});
  }, [fetchNotifs]);

  const handleTap = (notif: Notif) => {
    // targetUrlが /moments のみでmomentIdがある場合、highlight付きで遷移
    if (notif.targetUrl === '/moments' && notif.momentId) {
      router.push(`/moments?highlight=${notif.momentId}`);
    } else if (notif.targetUrl) {
      router.push(notif.targetUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-white">通知</h1>
          </div>
          <span className="text-[10px] text-white/30 font-medium">タイムライン</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex flex-col gap-3 px-4 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-900/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-white/40 text-sm text-center">通知はまだありません</p>
            <p className="text-white/20 text-xs text-center mt-1">キャラからのメッセージやコメントの通知がここに届きます</p>
            <p className="text-white/20 text-xs text-center mt-1">キャラクターがコメントに返信すると<br />ここに届きます</p>
          </div>
        ) : (
          <div className="px-4 pt-3 flex flex-col gap-1.5">
            {notifs.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? { icon: '🔔', color: 'text-white/60', label: '' };
              return (
                <button
                  key={n.id}
                  onClick={() => handleTap(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                    n.isRead
                      ? 'bg-gray-900/40 hover:bg-gray-900/60'
                      : 'bg-gray-900/80 hover:bg-gray-900 border border-purple-500/15'
                  }`}
                >
                  {/* アバター or アイコン */}
                  <div className="flex-shrink-0 mt-0.5">
                    {n.actorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div className="relative w-10 h-10">
                        <img src={n.actorAvatar} alt={n.actorName ?? ''} className="w-10 h-10 rounded-full object-cover" />
                        <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">{cfg.icon}</span>
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl`}>
                        {cfg.icon}
                      </div>
                    )}
                  </div>

                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold leading-snug line-clamp-1">{n.title}</p>
                    <p className="text-white/50 text-xs leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-white/25 text-[10px] mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* 未読インジケーター */}
                  {!n.isRead && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
