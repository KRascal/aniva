'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

export function PollBannerSection() {
  const router = useRouter();
  const [activePollCount, setActivePollCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/polls/active')
      .then((r) => r.json())
      .then((data) => {
        const count = (data.polls ?? []).length;
        setActivePollCount(count > 0 ? count : 0);
      })
      .catch(() => setActivePollCount(0));
  }, []);

  if (activePollCount === null || activePollCount === 0) return null;

  return (
    <FadeSection delay={22}>
      <div className="mb-5">
        <button
          onClick={() => router.push('/polls')}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 2px 16px rgba(139,92,246,0.15)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-purple-300 text-[10px] font-black tracking-widest uppercase">
                  ストーリー投票
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: 'rgba(139,92,246,0.25)',
                    color: 'rgba(196,181,254,0.9)',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}
                >
                  {activePollCount}件受付中
                </span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">
                投票受付中！推しの未来を決めよう
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                あなたの一票がストーリーを動かす
              </p>
            </div>
            <div className="flex-shrink-0">
              <span
                className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                  boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
                }}
              >
                投票する →
              </span>
            </div>
          </div>
        </button>
      </div>
    </FadeSection>
  );
}
