'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  label: string;
  superAdminOnly?: boolean;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: '運営管理',
    items: [
      { href: '/admin', label: 'ダッシュボード', icon: '📊' },
      { href: '/admin/characters', label: 'キャラクター管理', icon: '🎭' },
      { href: '/admin/moments', label: 'モーメンツ', icon: '📸' },
      { href: '/admin/stories', label: 'ストーリーズ', icon: '📖' },
      { href: '/admin/scenarios', label: '限定シナリオ', icon: '📖' },
      { href: '/admin/letters', label: '手紙管理', icon: '✉️' },
      { href: '/admin/notifications', label: '通知配信', icon: '🔔' },
      { href: '/admin/lore', label: 'ローアブック', icon: '📚' },
    ],
  },
  {
    label: 'コマース',
    items: [
      { href: '/admin/gacha', label: 'ガチャ', icon: '🎰' },
      { href: '/admin/shop', label: 'ショップ', icon: '🛍' },
      { href: '/admin/coins', label: 'コインパッケージ', icon: '🪙' },
      { href: '/admin/downloadable-content', label: '限定DLC', icon: '📦' },
    ],
  },
  {
    label: '分析',
    items: [
      { href: '/admin/analytics', label: '分析', icon: '📈' },
      { href: '/admin/addiction', label: '中毒設計', icon: '🧪' },
      { href: '/admin/users', label: 'ユーザー', icon: '👥' },
      { href: '/admin/feedback', label: 'フィードバック', icon: '💬' },
      { href: '/admin/polls', label: '投票管理', icon: '🗳' },
    ],
  },
  {
    label: 'IP管理',
    items: [
      { href: '/admin/approvals', label: '監修・承認', icon: '📋' },
      { href: '/admin/guardrails', label: 'ガードレール', icon: '🛡' },
      { href: '/admin/contracts', label: '契約管理', icon: '📄' },
    ],
  },
  {
    label: 'システム',
    superAdminOnly: true,
    items: [
      { href: '/admin/tenants', label: 'テナント管理', icon: '🏢' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/login');
      return;
    }
    // Check admin
    fetch('/api/admin/stats', { method: 'GET' })
      .then((r) => {
        if (r.status === 403) {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
        setAdminChecked(true);
      })
      .catch(() => setAdminChecked(true));
  }, [session, status, router]);

  if (status === 'loading' || !adminChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!session) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">管理者権限が必要です</h1>
          {session?.user?.email ? (
            <>
              <p className="text-gray-400 mb-1">現在のログイン:</p>
              <p className="text-white font-mono text-sm mb-4 bg-gray-800 px-3 py-2 rounded-lg">{session.user.email}</p>
              <p className="text-gray-500 text-xs mb-6">このメールアドレスには管理者権限がありません。<br/>管理者アカウントでログインし直してください。</p>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors mb-3 w-full"
              >
                別のアカウントでログイン
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-6">管理画面にアクセスするにはログインが必要です。</p>
              <Link
                href="/login"
                className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors mb-3 w-full text-center"
              >
                ログインする
              </Link>
            </>
          )}
          <Link href="/" className="inline-block text-gray-500 hover:text-gray-300 text-sm mt-2">
            ← トップへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex md:flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
          <div>
            <div className="text-white font-bold text-sm">ANIVA Admin</div>
            <div className="text-gray-500 text-xs truncate">{session.user?.email}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div
              key={section.label}
              data-section={section.label}
              {...(section.superAdminOnly ? { 'data-super-admin-only': 'true' } : {})}
            >
              {sIdx > 0 && <div className="border-t border-gray-800 my-3" />}
              <div className="px-3 py-1.5 text-gray-500 text-[10px] font-semibold uppercase tracking-widest">
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                      ${active
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors">
            <span>←</span>
            <span>サイトへ戻る</span>
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-bold">ANIVA Admin</span>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
