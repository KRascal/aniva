'use client';

import { useRouter } from 'next/navigation';

// ── TinderUI発見バナー ──
export function DiscoverBanner() {
  const router = useRouter();
  return (
    <div className="mb-5">
      <button
        onClick={() => router.push('/discover')}
        className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.95), rgba(236,72,153,0.9))',
          boxShadow: '0 4px 28px rgba(139,92,246,0.5)',
        }}
      >
        <div className="px-4 py-4 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">✨</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base leading-tight">新しいキャラを発見しよう</p>
            <p className="text-white/75 text-xs mt-0.5">スワイプして推しを見つけよう</p>
          </div>
          <span
            className="text-white font-bold text-xs px-4 py-2 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            スワイプで探す →
          </span>
        </div>
      </button>
    </div>
  );
}
