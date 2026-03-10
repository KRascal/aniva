'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

// ── 期間限定シナリオ型 ──
interface LimitedScenarioSummary {
  id: string;
  title: string;
  description: string | null;
  endsAt: string;
  isExpired: boolean;
  isRead: boolean;
  remainingHours: number;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}

// ── 期間限定シナリオ残り時間カウントダウン ──
function useScenarioCountdown(endsAt: string): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('終了');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`残り${d}日${h % 24}時間`);
      } else if (h > 0) {
        setLabel(`残り${h}時間${m}分`);
      } else {
        setLabel(`残り${m}分！`);
      }
    }
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [endsAt]);

  return label;
}

// ── 期間限定シナリオバナーカード ──
function LimitedScenarioBannerCard({ scenario }: { scenario: LimitedScenarioSummary }) {
  const router = useRouter();
  const countdown = useScenarioCountdown(scenario.endsAt);
  const isUrgent = scenario.remainingHours <= 6;

  return (
    <button
      onClick={() => router.push(`/scenario/${scenario.id}`)}
      className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(220,38,38,0.18), rgba(154,52,18,0.15))'
          : 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(251,113,133,0.15), rgba(139,92,246,0.12))',
        border: isUrgent
          ? '1px solid rgba(239,68,68,0.5)'
          : '1px solid rgba(239,68,68,0.35)',
        boxShadow: isUrgent
          ? '0 4px 24px rgba(239,68,68,0.25), 0 0 0 1px rgba(239,68,68,0.15)'
          : '0 2px 16px rgba(239,68,68,0.12)',
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* キャラアバター */}
        <div className="flex-shrink-0 relative">
          {scenario.character.avatarUrl ? (
            <img
              src={scenario.character.avatarUrl}
              alt={scenario.character.name}
              className="w-12 h-12 rounded-full object-cover"
              style={{
                boxShadow: '0 0 0 2px rgba(239,68,68,0.5), 0 4px 12px rgba(0,0,0,0.4)',
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-white font-bold text-base">
              {scenario.character.name.charAt(0)}
            </div>
          )}
          {/* 未読ドット */}
          {!scenario.isRead && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full ring-2 ring-gray-950 animate-pulse" />
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-red-400 text-[10px] font-black tracking-widest uppercase">期間限定</span>
            {isUrgent && (
              <span className="text-red-300 text-xs font-bold bg-red-500/20 px-1.5 py-0.5 rounded-full border border-red-500/30">
                🔥 まもなく終了
              </span>
            )}
          </div>
          <p className="text-white font-bold text-sm leading-tight truncate">{scenario.title}</p>
          {scenario.description && (
            <p className="text-white/55 text-xs mt-0.5 truncate">{scenario.description}</p>
          )}
          <p className={`text-xs font-semibold mt-1 ${isUrgent ? 'text-red-300' : 'text-red-400/80'}`}>
            ⏰ {countdown}
          </p>
        </div>

        {/* CTAラベル */}
        <div className="flex-shrink-0">
          <span
            className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: isUrgent
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.8))',
              boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
            }}
          >
            読む →
          </span>
        </div>
      </div>

      {/* FOOMOメッセージ帯 */}
      <div
        className="px-4 py-1.5 text-center text-[10px] font-bold tracking-wide"
        style={{
          background: isUrgent
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(239,68,68,0.08)',
          borderTop: '1px solid rgba(239,68,68,0.15)',
          color: 'rgba(252,165,165,0.85)',
        }}
      >
        ⚠️ 見逃すと二度と読めない
      </div>
    </button>
  );
}

// ── 期間限定シナリオセクション ──
export function LimitedScenariosSection() {
  const [scenarios, setScenarios] = useState<LimitedScenarioSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/scenarios/active')
      .then(r => r.json())
      .then(data => {
        const active = (data.scenarios ?? []).filter((s: LimitedScenarioSummary) => !s.isExpired);
        setScenarios(active);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || scenarios.length === 0) return null;

  return (
    <FadeSection delay={25}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-white font-bold text-base">期間限定シナリオ</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.3))',
              color: 'rgba(252,165,165,0.9)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {scenarios.length}件
          </span>
        </div>
        <div className="space-y-3">
          {scenarios.map(s => (
            <LimitedScenarioBannerCard key={s.id} scenario={s} />
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
