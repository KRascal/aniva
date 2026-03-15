/**
 * Chat page shared type definitions
 */

export interface RelationshipInfo {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  /** API response field (from /api/relationship/:id) */
  id?: string;
  /** Alias used in some places */
  relationshipId?: string;
  lastMessageAt?: string | null;
  character?: {
    id?: string;
    name: string;
    slug: string;
    nameEn?: string | null;
    franchise?: string;
    franchiseEn?: string | null;
    description?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    catchphrases?: string[];
    personalityTraits?: string[];
    voiceModelId?: string | null;
  };
  isFanclub?: boolean;
  isFollowing?: boolean;
  sharedTopics?: { type: string; text: string }[];
  streakDays?: number;
  previousStreakDays?: number;
  isStreakActive?: boolean;
}

export type MemoryData = {
  factMemory: { fact: string; source: string; confidence: number; updatedAt: string }[];
  episodeMemory: { summary: string; date: string; emotion: string; importance: number }[];
  emotionMemory: { topic: string; userEmotion: string; characterReaction: string; date: string }[];
  preferences: { likes: string[]; dislikes: string[] };
  userName?: string;
  totalMessages: number;
  firstMessageAt: string | null;
};

export type PresenceInfo = {
  isAvailable: boolean;
  status: string;
  statusEmoji: string;
  statusMessage?: string | null;
};

export type DailyEventInfo = {
  eventType: string;
  message: string;
  bonusCoins?: number;
  bonusXpMultiplier?: number;
  greeting?: string;
};
