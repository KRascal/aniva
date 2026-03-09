'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useCallback, useRef } from 'react';
import { track, EVENTS } from '@/lib/analytics';

const HIDDEN_PATHS = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy', '/onboarding'];

const navItems = [
  {
    href: '/explore',
    label: 'さがす',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    href: '/moments',
    label: 'タイムライン',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'チャット',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/mypage',
    label: 'マイページ',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [unreadLetters, setUnreadLetters] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);

  // ページ読み込み時のBuild IDを記録
  useEffect(() => {
    fetch('/api/build-id').then(r => r.json()).then(d => {
      if (d.buildId) setInitialBuildId(d.buildId);
    }).catch(() => {});
  }, []);

  const router = useRouter();

  // ナビゲーション前にBuild IDチェック（不一致ならフルリロード）
  // 先にpreventDefaultしてから非同期判定
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!initialBuildId) return; // チェック不可なら通常ナビ
    e.preventDefault();
    fetch('/api/build-id').then(r => r.json()).then(d => {
      if (d.buildId && d.buildId !== initialBuildId) {
        // Build IDが変わった → フルリロード
        window.location.href = href;
      } else {
        // Build ID一致 → クライアントルーティング
        router.push(href);
      }
    }).catch(() => {
      // fetch失敗 → フルリロードにフォールバック
      window.location.href = href;
    });
  }, [initialBuildId, router]);

  useEffect(() => {
    // 未読レター数を取得（30秒ごとにポーリング）
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/letters/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadLetters(data.count ?? 0);
        }
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // チャット未読数をサーバーサイドAPIから取得（正確）
    const fetchChatUnread = async () => {
      try {
        const res = await fetch('/api/chat/unread-count');
        if (res.ok) {
          const data = await res.json();
          setChatUnreadCount(data.count ?? 0);
        }
      } catch { /* ignore */ }
    };
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  // 通知未読数ポーリング
  useEffect(() => {
    const fetchNotifUnread = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          setNotifUnreadCount(data.count ?? 0);
        }
      } catch { /* ignore */ }
    };
    fetchNotifUnread();
    const interval = setInterval(fetchNotifUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Track tab switches
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      const tabName = pathname.split('/')[1] || 'explore';
      track(EVENTS.TAB_SWITCHED, { tab: tabName, from: prevPathRef.current });
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (pathname.startsWith('/c/')) return null;

  const isHome = pathname === '/explore' || pathname === '/explore/';
  const isTimeline = pathname === '/moments' || pathname.startsWith('/moments');
  const isChat = pathname.startsWith('/chat');
  const isStories = pathname.startsWith('/stories');
  const isCards = pathname.startsWith('/cards') || pathname.startsWith('/memory-cards') || pathname.startsWith('/explore/gacha');
  const isMypage = pathname.startsWith('/mypage') || pathname.startsWith('/profile');
  const isActive = (href: string) => {
    if (href === '/explore') return pathname === '/explore' || pathname === '/explore/';
    if (href === '/mypage') return pathname.startsWith('/mypage') || pathname.startsWith('/profile');
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-white/5"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-around items-stretch h-16 [&_a]:active:scale-95 [&_a]:transition-transform [&_a]:duration-100">

          {/* 1. さがす */}
          <Link
            href="/explore"
            onClick={(e) => handleNavClick(e, '/explore')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isHome ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isHome ? 'bg-purple-500/15' : ''}`}>
              <svg className="w-6 h-6" fill={isHome ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isHome && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />}
            </div>
            <span className={`text-[10px] font-semibold ${isHome ? 'text-purple-400' : 'text-gray-500'}`}>{t('explore')}</span>
          </Link>

          {/* 2. タイムライン */}
          <Link
            href="/moments"
            onClick={(e) => handleNavClick(e, '/moments')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isTimeline ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isTimeline ? 'bg-purple-500/15' : ''}`}>
              <svg className="w-6 h-6" fill={isTimeline ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isTimeline ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isTimeline && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />}
              {notifUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-xs font-bold rounded-full leading-none border border-gray-950">
                  {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${isTimeline ? 'text-purple-400' : 'text-gray-500'}`}>{t('moments')}</span>
          </Link>

          {/* 3. チャット（中央・特別強調） */}
          <Link
            href="/chat"
            onClick={(e) => handleNavClick(e, '/chat')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isChat ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-12 h-12 -mt-4 rounded-2xl transition-all ${
              isChat
                ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 shadow-lg shadow-purple-500/40 scale-110'
                : 'bg-gradient-to-br from-purple-600/80 to-pink-600/80 shadow-md shadow-purple-500/20'
            }`}>
              <svg className="w-6 h-6 text-white" fill={isChat ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isChat ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none border-2 border-gray-950">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${isChat ? 'text-purple-400' : 'text-gray-400'}`}>{t('chat')}</span>
          </Link>

          {/* 4. カード */}
          <Link
            href="/cards"
            onClick={(e) => handleNavClick(e, '/cards')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isCards ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isCards ? 'bg-purple-500/15' : ''}`}>
              <svg className="w-6 h-6" fill={isCards ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isCards ? 0 : 1.8}>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h4m-4 4h10m-10 4h6" />
              </svg>
              {isCards && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />}
            </div>
            <span className={`text-[10px] font-semibold ${isCards ? 'text-purple-400' : 'text-gray-500'}`}>カード</span>
          </Link>

          {/* 5. マイページ */}
          <Link
            href="/mypage"
            onClick={(e) => handleNavClick(e, '/mypage')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isMypage ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isMypage ? 'bg-purple-500/15' : ''}`}>
              <svg className="w-6 h-6" fill={isMypage ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isMypage ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {isMypage && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />}
              {unreadLetters > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-pink-500 text-white text-xs font-bold rounded-full leading-none">
                  {unreadLetters > 9 ? '9+' : unreadLetters}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${isMypage ? 'text-purple-400' : 'text-gray-500'}`}>{t('mypage')}</span>
          </Link>
        </div>
      </nav>
      <div className="h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  );
}
