'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const HIDDEN_PATHS = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy'];

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

  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (pathname.match(/^\/chat\/[^/]+$/)) return null;

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
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] relative transition-colors duration-200"
                style={{ color: active ? 'var(--color-accent)' : '#6b7280' }}
              >
                {item.icon}
                <span className="text-[10px] font-semibold">{item.label}</span>
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  );
}
