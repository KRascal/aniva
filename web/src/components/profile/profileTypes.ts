/**
 * Shared type definitions for the Profile feature
 * Extracted from profile/[characterId]/page.tsx
 */

import type { PersonalityTrait } from './ProfileComponents';

export type { PersonalityTrait };

export interface RelationshipData {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
  character?: { name: string; slug: string };
  preferences?: { 呼び名?: string; 趣味?: string[] };
}

export interface Character {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn?: string;
  description?: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
  personalityTraits?: PersonalityTrait[];
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  fcOverageCallCoinPerMin: number;
  birthday?: string | null;
}

export interface DiaryItem {
  id: string;
  characterId: string;
  date: string;
  content: string;
  mood: string;
  imageUrl: string | null;
  likes: number;
  createdAt: string;
  isLiked: boolean;
}

export interface MomentItem {
  id: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  publishedAt: string;
  reactionCount: number;
  userHasLiked: boolean;
  isLocked: boolean;
  visibility?: string;
}

export interface DlContent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
  fcOnly: boolean;
  downloadCount: number;
  createdAt: string;
  locked: boolean;
}

export interface MilestoneWithAchieved {
  id: string;
  level: number;
  title: string;
  description: string;
  characterMessage: string;
  emoji: string;
  achieved: boolean;
}

export interface MilestonesData {
  milestones: MilestoneWithAchieved[];
  currentLevel: number;
}

export interface RankingEntry {
  rank: number;
  maskedName: string;
  totalMessages: number;
  level: number;
  isMe: boolean;
}
