'use client';

import { useState, useEffect, useCallback } from 'react';
import CharacterOrb, { CharacterSuggestion } from './CharacterOrb';

/** Deterministic color palette for orbs */
const ORB_COLORS = [
  '#a855f7', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
];

interface AmbientSpaceProps {
  onTap: (character: CharacterSuggestion) => void;
  /** Max orbs to show (default: 6) */
  maxOrbs?: number;
}

/**
 * Fetches character list and lays out CharacterOrbs in the ambient space.
 * Positions are computed once on mount to avoid jitter.
 */
export default function AmbientSpace({ onTap, maxOrbs = 6 }: AmbientSpaceProps) {
  const [characters, setCharacters] = useState<CharacterSuggestion[]>([]);
  const [positions, setPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [loading, setLoading] = useState(true);

  const computePositions = useCallback((count: number) => {
    // Arrange orbs on a rough circle, with slight random scatter
    // Safe zone: 15%–85% x, 15%–80% y (avoid edges on mobile)
    const result: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const radiusX = 30; // vw
      const radiusY = 26; // vh
      // Seed-based pseudo-random offset (deterministic per index)
      const offsetX = ((i * 37 + 11) % 20) - 10;
      const offsetY = ((i * 53 + 7) % 20) - 10;
      result.push({
        x: Math.min(Math.max(50 + radiusX * Math.cos(angle) + offsetX, 12), 88),
        y: Math.min(Math.max(48 + radiusY * Math.sin(angle) + offsetY, 12), 82),
      });
    }
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/characters');
        if (!res.ok) throw new Error('fetch failed');
        const data: { characters: CharacterSuggestion[] } = await res.json();
        if (cancelled) return;

        const slice = data.characters.slice(0, maxOrbs);
        setCharacters(slice);
        setPositions(computePositions(slice.length));
      } catch (err) {
        console.error('[AmbientSpace] Failed to load characters', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [maxOrbs, computePositions]);

  if (loading) {
    // Minimal loading — dark background, no spinner (keeps the mood)
    return null;
  }

  return (
    <>
      {characters.map((char, i) => (
        <CharacterOrb
          key={char.slug}
          character={char}
          initialPosition={positions[i] ?? { x: 50, y: 50 }}
          index={i}
          color={ORB_COLORS[i % ORB_COLORS.length]}
          onTap={onTap}
        />
      ))}
    </>
  );
}
