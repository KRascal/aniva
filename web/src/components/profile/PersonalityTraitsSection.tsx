'use client';

import { TRAIT_LABELS, TRAIT_COLORS, type PersonalityTrait } from '@/app/profile/[characterId]/profile-data';

export interface PersonalityTraitsSectionProps {
  traits: PersonalityTrait[];
}

export function PersonalityTraitsSection({ traits }: PersonalityTraitsSectionProps) {
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
