'use client';

import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

// ── ガチャバナーセクション ──
export function GachaBannerSection({ freeAvailable }: { freeAvailable: boolean }) {
  const router = useRouter();

  return (
    <FadeSection delay={12}>
      <div className="mb-5">
        <button
          onClick={() => router.push('/explore/gacha')}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(120,53,15,0.25), rgba(88,28,135,0.2), rgba(78,20,140,0.15))',
            border: '1px solid rgba(245,158,11,0.35)',
            boxShadow: '0 2px 20px rgba(245,158,11,0.12)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12M3.27 6.96L12 12.01l8.73-5.05"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-yellow-400 text-[10px] font-black tracking-widest uppercase">
                  ガチャ
                </span>
                {freeAvailable && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                    style={{
                      background: 'rgba(16,185,129,0.25)',
                      color: 'rgba(52,211,153,0.95)',
                      border: '1px solid rgba(16,185,129,0.4)',
                    }}
                  >
                    🎁 無料あり
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-sm leading-tight">
                推しカードをゲットしよう！
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                毎日1回無料で引ける
              </p>
            </div>
            <div className="flex-shrink-0">
              <span
                className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.9), rgba(120,53,15,0.9))',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                }}
              >
                引く →
              </span>
            </div>
          </div>
        </button>
      </div>
    </FadeSection>
  );
}
