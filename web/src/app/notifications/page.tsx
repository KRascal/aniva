'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Notif {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actorName?: string;
  actorAvatar?: string;
  targetUrl?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : { notifications: [] })
      .then(d => { setNotifs(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '今';
    if (m < 60) return `${m}分前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}時間前`;
    return `${Math.floor(h / 24)}日前`;
  };

  const icon = (type: string) => {
    if (type === 'comment_reply') return '💬';
    if (type === 'like') return '❤️';
    if (type === 'follow') return '👤';
    if (type === 'character_message') return '✨';
    return '🔔';
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <header className="sticky top-0 z-20 bg-gray-950 border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">通知</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto">
        {loading ? (
          <p className="text-white/30 text-center py-12">読み込み中...</p>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-white/40 text-sm">通知はまだありません</p>
          </div>
        ) : notifs.map(n => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-4 py-3.5 border-b border-white/5 cursor-pointer hover:bg-white/3 transition-colors ${!n.isRead ? 'bg-purple-950/20' : ''}`}
            onClick={() => n.targetUrl && router.push(n.targetUrl)}
          >
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
              {n.actorAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={n.actorAvatar} alt="" className="w-full h-full object-cover" />
                : <span>{icon(n.type)}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white/80 leading-snug">{n.message}</p>
              <p className="text-[11px] text-white/30 mt-0.5">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}
