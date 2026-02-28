'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

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

  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (pathname.startsWith('/chat/')) return null;
  if (pathname.startsWith('/c/')) return null;

  const isActive = (href: string) => {
    if (href === '/explore') return pathname === '/explore' || pathname === '/explore/';
    if (href === '/mypage') return pathname.startsWith('/mypage') || pathname.startsWith('/profile');
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-around items-stretch h-16">

          {/* Explore */}
          <Link
            href="/explore"
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

          {/* Timeline */}
          <Link
            href="/moments"
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isTimeline ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isTimeline ? 'bg-purple-500/15' : ''}`}>
              <svg className="w-6 h-6" fill={isTimeline ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isTimeline ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isTimeline && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />}
            </div>
            <span className={`text-[10px] font-semibold ${isTimeline ? 'text-purple-400' : 'text-gray-500'}`}>{t('moments')}</span>
          </Link>

          {/* Chat - center, prominent */}
          <Link
            href="/chat"
            className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1"
          >
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-lg ${
              isChat
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-purple-900/50 scale-105'
                : 'bg-gradient-to-br from-purple-700/60 to-pink-700/60 shadow-purple-900/30 hover:from-purple-600 hover:to-pink-600'
            }`}>
              <svg className="w-6 h-6 text-white" fill={isChat ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isChat ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className={`text-[10px] font-semibold ${isChat ? 'text-purple-400' : 'text-gray-400'}`}>{t('chat')}</span>
          </Link>

          {/* My Page */}
          <Link
            href="/mypage"
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-all rounded-xl mx-1 ${
              isMypage ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isMypage ? 'bg-purple-500/15' : ''}`}>
              <svg className="w-6 h-6" fill={isMypage ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isMypage ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {isMypage && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />}
            </div>
            <span className={`text-[10px] font-semibold ${isMypage ? 'text-purple-400' : 'text-gray-500'}`}>{t('mypage')}</span>
          </Link>
        </div>
      </nav>
      <div className="h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  );
}
