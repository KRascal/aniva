'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const HIDDEN_PATHS = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy'];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on landing, auth, pricing, and legal pages
  if (HIDDEN_PATHS.includes(pathname)) return null;

  // Hide on individual chat character page (has its own input bar)
  if (pathname.match(/^\/chat\/[^/]+$/)) return null;

  const isHome = pathname === '/chat' || pathname === '/chat/';
  const isTimeline = pathname.startsWith('/moments');
  const isChat = !isHome && pathname.startsWith('/chat');
  const isMypage = pathname.startsWith('/mypage') || pathname.startsWith('/profile');

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-white/8 flex justify-around items-center h-16"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ホーム */}
        <Link
          href="/chat"
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors rounded-xl ${
            isHome ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill={isHome ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 0 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className={`text-[10px] font-medium ${isHome ? 'text-purple-400' : 'text-gray-500'}`}>ホーム</span>
        </Link>

        {/* タイムライン */}
        <Link
          href="/moments"
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors rounded-xl ${
            isTimeline ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill={isTimeline ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isTimeline ? 0 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-[10px] font-medium ${isTimeline ? 'text-purple-400' : 'text-gray-500'}`}>タイムライン</span>
        </Link>

        {/* チャット (個別チャットのリスト — /chat/ 配下) */}
        <Link
          href="/chat"
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors rounded-xl ${
            isChat ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill={isChat ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isChat ? 0 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className={`text-[10px] font-medium ${isChat ? 'text-purple-400' : 'text-gray-500'}`}>チャット</span>
        </Link>

        {/* マイページ */}
        <Link
          href="/mypage"
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors rounded-xl ${
            isMypage ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6" fill={isMypage ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isMypage ? 0 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className={`text-[10px] font-medium ${isMypage ? 'text-purple-400' : 'text-gray-500'}`}>マイページ</span>
        </Link>
      </nav>
      <div className="h-16" />
    </>
  );
}
