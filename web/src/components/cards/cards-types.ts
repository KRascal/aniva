// ── Types ──

export interface OwnedCard {
  userCardId: string;
  obtainedAt: string;
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    rarity: string;
    category: string | null;
    character: { id: string; name: string; avatarUrl: string | null } | null;
  };
}

// ── Rarity helpers ──

export const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  UR: { bg: 'from-amber-400 via-yellow-300 to-amber-500', border: 'border-amber-400', text: 'text-amber-300', glow: 'shadow-amber-500/50' },
  SSR: { bg: 'from-purple-500 via-pink-400 to-purple-600', border: 'border-purple-400', text: 'text-purple-300', glow: 'shadow-purple-500/50' },
  SR: { bg: 'from-blue-500 via-cyan-400 to-blue-600', border: 'border-blue-400', text: 'text-blue-300', glow: 'shadow-blue-500/40' },
  R: { bg: 'from-green-500 to-emerald-600', border: 'border-green-500', text: 'text-green-400', glow: 'shadow-green-500/30' },
  N: { bg: 'from-gray-500 to-gray-600', border: 'border-gray-500', text: 'text-gray-400', glow: '' },
};

export function getRarityStyle(rarity: string) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.N;
}
