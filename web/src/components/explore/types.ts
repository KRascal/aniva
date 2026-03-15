export interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
  followerCount?: number;
  birthday?: string | null;
}

export interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  isFollowing: boolean;
  isFanclub: boolean;
}
