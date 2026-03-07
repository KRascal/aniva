import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      {/* 背景グロー */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-900/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-sm">
        {/* アイコン */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--color-surface)] border border-white/5 flex items-center justify-center shadow-lg shadow-purple-900/20">
          <span className="text-3xl">🌙</span>
        </div>

        <h1 className="text-5xl font-bold text-[var(--color-text)] mb-3 tracking-tight">404</h1>
        <p className="text-[var(--color-text)] font-medium mb-1">ここには何もないみたい</p>
        <p className="text-sm text-[var(--color-muted)] mb-8">
          探してるページは別の場所にあるのかも
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/explore"
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium inline-block text-center
                       shadow-lg shadow-purple-900/30 active:scale-[0.97] transition-transform"
          >
            探しに行く
          </Link>
          <Link
            href="/"
            className="w-full px-6 py-3.5 bg-[var(--color-surface)] border border-white/5 rounded-xl font-medium text-[var(--color-muted)] inline-block text-center
                       active:scale-[0.97] transition-transform"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
