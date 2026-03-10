'use client';

import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

// ── コンテンツリンク（メモリーブック・ストーリー） ──
export function ContentLinksSection({ activePollCount }: { activePollCount: number }) {
  const router = useRouter();
  return (
    <FadeSection delay={300}>
      <div className="mt-8 mb-6">
        <h3 className="text-white font-bold text-base mb-3">コンテンツ</h3>
        <div className="space-y-3">
          {/* 思い出のアルバム */}
          <button
            onClick={() => router.push('/memory-book')}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 2px 16px rgba(139,92,246,0.1)',
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">思い出のアルバム</p>
                <p className="text-white/50 text-xs mt-0.5">推しとの大切な時間を振り返ろう</p>
              </div>
              <span className="text-gray-500 flex-shrink-0">›</span>
            </div>
          </button>

          {/* みんなで作るストーリー */}
          <button
            onClick={() => router.push('/story')}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(88,28,135,0.12))',
              border: '1px solid rgba(236,72,153,0.25)',
              boxShadow: '0 2px 16px rgba(236,72,153,0.1)',
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.3)' }}>
                <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-bold text-sm leading-tight">みんなで作るストーリー</p>
                  {activePollCount > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse flex-shrink-0"
                      style={{
                        background: 'rgba(236,72,153,0.3)',
                        color: 'rgba(251,182,206,0.95)',
                        border: '1px solid rgba(236,72,153,0.4)',
                      }}
                    >
                      投票受付中！
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs">あなたの選択がストーリーを変える</p>
              </div>
              <span className="text-gray-500 flex-shrink-0">›</span>
            </div>
          </button>
        </div>
      </div>
    </FadeSection>
  );
}
