'use client';

import { usePathname } from 'next/navigation';

const HIDDEN_PATHS = ['/', '/login', '/signup', '/pricing'];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on landing, auth, and pricing pages
  if (HIDDEN_PATHS.includes(pathname)) return null;

  // Hide on chat character page (has its own input bar)
  if (pathname.match(/^\/chat\/[^/]+$/)) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex justify-around items-center h-14 pb-[env(safe-area-inset-bottom)]">
        <a
          href="/chat"
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-purple-400 transition-colors py-2 px-6"
        >
          <span className="text-xl">💬</span>
          <span className="text-[10px]">チャット</span>
        </a>
        <a
          href="/moments"
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-purple-400 transition-colors py-2 px-6"
        >
          <span className="text-xl">📸</span>
          <span className="text-[10px]">タイムライン</span>
        </a>
      </nav>
      <div className="h-14" />
    </>
  );
}
