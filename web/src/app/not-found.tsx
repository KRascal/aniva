import Link from 'next/link';

/**
 * 404 page — server component, no framer-motion or client-side dependencies
 * to avoid chunk loading failures on stale cache
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950 text-white text-center">
      <div className="relative mb-8">
        <span className="text-[120px] font-black tracking-tighter bg-gradient-to-b from-white/20 to-transparent bg-clip-text text-transparent select-none leading-none">
          404
        </span>
      </div>
      <h1 className="text-xl font-bold mb-2 tracking-tight">
        ページが見つかりません
      </h1>
      <p className="text-sm text-white/50 mb-8 max-w-xs leading-relaxed">
        お探しのページは存在しないか、移動した可能性があります
      </p>
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-7 py-3 text-sm font-bold hover:brightness-110 active:scale-95 transition-all"
      >
        ホームへ戻る
      </Link>
    </div>
  );
}
