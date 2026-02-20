// ANIVA Shared Types & Utilities

// ============ Types ============

export interface Character {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  voiceModel?: string;
  liveModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptions: Subscription[];
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  characterId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt: Date;
}

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'ultimate';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'character';
  content: string;
  audioUrl?: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  characterId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// ============ Utilities ============

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, { label: string; priceJPY: number }> = {
  free: { label: '無料', priceJPY: 0 },
  basic: { label: 'ベーシック', priceJPY: 980 },
  premium: { label: 'プレミアム', priceJPY: 2980 },
  ultimate: { label: 'アルティメット', priceJPY: 9800 },
};
