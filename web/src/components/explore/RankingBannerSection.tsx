'use client';

import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

// ── ランキングバナー ──
export function RankingBannerSection() {
  const router = useRouter();
  return (
    <FadeSection delay={15}>
      <button
        onClick={() => router.push('/ranking')}
        className="w-full bg-gradient-to-r from-yellow-900/30 to-amber-900/20 rounded-2xl p-4 border border-yellow-500/20 hover:border-yellow-500/30 transition-all active:scale-[0.98] text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-white font-bold text-sm">ランキング</p>
              <p className="text-gray-400 text-xs mt-0.5">推し活ランキングで競い合おう</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </FadeSection>
  );
}
