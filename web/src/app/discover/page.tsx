'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ParticleField from '@/components/onboarding/ParticleField';
import AmbientSpace from '@/components/onboarding/AmbientSpace';
import type { CharacterSuggestion } from '@/components/onboarding/CharacterOrb';

/**
 * /discover — 気配の空間
 *
 * 黒背景にキャラクターの光（CharacterOrb）が漂い、
 * タップすると拡大→名前・キャッチフレーズ表示→ /c/[slug] へ遷移する。
 */
export default function DiscoverPage() {
  const router = useRouter();
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSuggestion | null>(null);
  const [fading, setFading] = useState(false);

  const handleOrbTap = (character: CharacterSuggestion) => {
    if (selectedCharacter) return; // Already transitioning
    setSelectedCharacter(character);

    // Fade to black and navigate after the orb expand animation
    setTimeout(() => setFading(true), 1200);
    setTimeout(() => {
      router.push(`/c/${character.slug}`);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Ambient particle layer */}
      <ParticleField
        density={18}
        colors={['#a855f7', '#ec4899', '#3b82f6', '#10b981']}
      />

      {/* Orb layer */}
      <div className="absolute inset-0">
        <AmbientSpace onTap={handleOrbTap} maxOrbs={6} />
      </div>

      {/* Subtle guide text — fades out once a character is selected */}
      <div
        className="absolute bottom-14 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
        style={{
          opacity: selectedCharacter ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      >
        <p
          className="text-white/25 text-xs tracking-[0.25em] text-center"
          style={{ letterSpacing: '0.2em' }}
        >
          気配を感じたら、触れてみて
        </p>
      </div>

      {/* Back link to top */}
      {!selectedCharacter && (
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 left-6 text-white/20 text-xs tracking-wider hover:text-white/50 transition-colors focus:outline-none"
          style={{ letterSpacing: '0.12em' }}
        >
          ← 戻る
        </button>
      )}

      {/* Fade-to-black overlay for transition */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{
          opacity: fading ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      />
    </div>
  );
}
