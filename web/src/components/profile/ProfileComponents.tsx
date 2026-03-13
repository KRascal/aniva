'use client';

import { TRAIT_LABELS, TRAIT_COLORS } from './profileData';

export interface PersonalityTrait {
  trait: string;
  value: number;
}

/* ── SparkStar ── */
export function SparkStar({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <span
      className={`inline-block transition-all duration-300 ${
        filled ? 'animate-[sparkle_1.5s_ease-in-out_infinite]' : 'opacity-25'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <svg
        className={`w-6 h-6 ${filled ? 'text-yellow-400' : 'text-gray-600'}`}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    </span>
  );
}

/* ── PersonalityTraitsSection ── */
export function PersonalityTraitsSection({ traits }: { traits: PersonalityTrait[] }) {
  if (!traits || traits.length === 0) return null;
  return (
    <div>
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
        パーソナリティ
      </p>
      <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/5 space-y-3">
        {traits.map((t) => {
          const label = TRAIT_LABELS[t.trait] ?? t.trait;
          const color = TRAIT_COLORS[t.trait] ?? 'from-purple-500 to-pink-500';
          const pct = Math.min(100, t.value);
          return (
            <div key={t.trait}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-gray-300 font-medium">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{pct}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  style={{ width: `${pct}%`, transition: 'width 1s ease-out' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
