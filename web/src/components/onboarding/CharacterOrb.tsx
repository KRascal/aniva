'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface CharacterSuggestion {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  franchise?: string | null;
  catchphrases: string[];
  avatarUrl?: string | null;
}

export interface CharacterOrbProps {
  character: CharacterSuggestion;
  /** 0–100 percentage position on screen */
  initialPosition: { x: number; y: number };
  /** Unique index used to vary animation timing and motion */
  index?: number;
  color: string;
  onTap: (character: CharacterSuggestion) => void;
}

/**
 * A floating glowing orb that represents a character in the /discover space.
 * Click/tap triggers expand animation → shows name + catchphrase → navigates to /c/[slug].
 */
export default function CharacterOrb({
  character,
  initialPosition,
  index = 0,
  color,
  onTap,
}: CharacterOrbProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'selected' | 'expanding'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vary float motion per orb using CSS custom properties
  const floatVars = useMemo(() => {
    const seed = index * 137.5; // golden-angle spacing
    const r = (base: number) => (((seed + base) % 60) - 30);
    return {
      '--orb-color': color,
      '--orb-x1': `${r(10)}px`,
      '--orb-y1': `${r(25)}px`,
      '--orb-x2': `${r(40)}px`,
      '--orb-y2': `${r(55)}px`,
      '--orb-x3': `${r(70)}px`,
      '--orb-y3': `${r(85)}px`,
    } as React.CSSProperties;
  }, [index, color]);

  const duration = 5 + (index % 4) * 1.2; // 5s – 8.6s
  const delay = (index * 0.8) % 4; // stagger start

  const catchphrase =
    (character.catchphrases && character.catchphrases.length > 0)
      ? character.catchphrases[0]
      : '…こっちを見てる？';

  const handleTap = () => {
    if (phase !== 'idle') return;

    setPhase('selected');
    onTap(character);

    // After showing the label, expand and navigate
    timerRef.current = setTimeout(() => {
      setPhase('expanding');
      timerRef.current = setTimeout(() => {
        router.push(`/c/${character.slug}`);
      }, 600);
    }, 1400);
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${initialPosition.x}%`,
        top: `${initialPosition.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: phase === 'idle' ? 10 : 20,
      }}
    >
      {/* Orb container — handles float animation */}
      <div
        style={{
          ...floatVars,
          animation:
            phase === 'idle'
              ? `orbFloat ${duration}s ease-in-out ${delay}s infinite, orbPulse ${duration * 0.8}s ease-in-out ${delay}s infinite`
              : phase === 'expanding'
              ? 'orbExpand 0.6s ease-out forwards'
              : 'none',
        }}
      >
        {/* The glowing sphere */}
        <button
          onClick={handleTap}
          aria-label={`${character.name}に近づく`}
          className="relative flex items-center justify-center rounded-full cursor-pointer focus:outline-none"
          style={{
            width: phase === 'selected' ? 90 : 64,
            height: phase === 'selected' ? 90 : 64,
            background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66 50%, ${color}22)`,
            boxShadow: `0 0 28px 10px ${color}55, 0 0 6px 2px ${color}99 inset`,
            transition: 'width 0.3s ease, height 0.3s ease',
            willChange: 'transform',
          }}
        />

        {/* Character info — appears when selected */}
        {phase === 'selected' && (
          <div
            className="absolute left-1/2 pointer-events-none"
            style={{
              transform: 'translateX(-50%)',
              top: 100,
              whiteSpace: 'nowrap',
              animation: 'orbReveal 0.35s ease-out forwards',
              textAlign: 'center',
            }}
          >
            <p
              className="text-white font-semibold text-sm tracking-wide"
              style={{ textShadow: `0 0 12px ${color}` }}
            >
              {character.name}
            </p>
            <p
              className="text-white/60 text-xs mt-1 max-w-[160px] leading-tight"
              style={{ textShadow: '0 0 8px rgba(255,255,255,0.3)' }}
            >
              {catchphrase}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
