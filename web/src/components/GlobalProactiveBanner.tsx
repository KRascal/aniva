'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface ProactiveMsg {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatarUrl: string | null;
  characterSlug: string;
  content: string;
  expiresAt: string;
  isRead: boolean;
}

export function GlobalProactiveBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [banner, setBanner] = useState<ProactiveMsg | null>(null);
  const [visible, setVisible] = useState(false);

  // チャット画面では表示しない
  const isInChat = pathname?.startsWith('/chat/');
  const isOnboarding = pathname?.startsWith('/onboarding');
  const isLogin = pathname?.startsWith('/login') || pathname === '/';

  useEffect(() => {
    if (!session?.user?.id || isInChat || isOnboarding || isLogin) return;

    const checkMessages = async () => {
      try {
        const res = await fetch('/api/proactive-messages');
        if (!res.ok) return;
        const data = await res.json();
        const msgs: ProactiveMsg[] = data.messages ?? [];
        // 未読のみバナー表示
        const unread = msgs.filter((m) => !m.isRead);
        if (unread.length > 0 && !banner) {
          setBanner(unread[0]);
          setVisible(true);
          // 8秒後に自動消去
          setTimeout(() => setVisible(false), 8000);
        }
      } catch {
        // ignore
      }
    };

    checkMessages();
    const interval = setInterval(checkMessages, 30000); // 30秒ごと
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isInChat, pathname]);

  const handleClick = () => {
    if (!banner) return;
    setVisible(false);
    // 既読にする（[id]ルート経由）
    fetch(`/api/proactive-messages/${banner.id}`, {
      method: 'DELETE',
    }).catch(() => {});
    router.push(`/chat/${banner.characterId}`);
  };

  if (!visible || !banner) return null;

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[calc(100%-24px)]"
      style={{
        animation: visible ? 'bannerSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards' : 'bannerSlideOut 0.3s ease-in forwards',
      }}
    >
      <style>{`
        @keyframes bannerSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
        }
        @keyframes bannerSlideOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.95); }
        }
      `}</style>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
        style={{
          background: 'rgba(17,10,35,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.1)',
        }}
      >
        {/* アバター */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {banner.characterAvatarUrl ? (
              <Image src={banner.characterAvatarUrl} alt={banner.characterName} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">✨</div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-950" />
        </div>
        {/* テキスト */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold truncate">{banner.characterName}</p>
          <p className="text-gray-300 text-xs line-clamp-1 mt-0.5 leading-tight">{banner.content}</p>
        </div>
        {/* 閉じるボタン */}
        <button
          onClick={(e) => { e.stopPropagation(); setVisible(false); }}
          className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </button>
    </div>
  );
}
