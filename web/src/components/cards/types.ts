import type { GachaRarity } from '@/components/gacha/GachaFlipCard';

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

export interface GachaBanner {
  id: string;
  name: string;
  description: string | null;
  characterId: string | null;
  costCoins: number;
  cost10Coins: number;
  startAt: string;
  endAt: string;
  franchise: string | null;
  bannerImageUrl: string | null;
  themeColor: string | null;
  rateUp: number | Record<string, number> | null;
}

export interface PullResultCard {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  cardImageUrl: string | null;
  illustrationUrl: string | null;
  rarity: GachaRarity;
  category: string | null;
  character: { id: string; name: string; avatarUrl: string | null } | null;
  isNew: boolean;
  frameType: string | null;
}
