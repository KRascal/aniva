/**
 * チャット一覧ページ共通型定義
 */

export interface ChatCharacter {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn: string;
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
}

export interface ChatRelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  lastMessageAt: string | null;
  isFollowing?: boolean;
  isFanclub?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  pinnedAt?: string | null;
  character?: { name: string; slug: string; avatarUrl?: string | null };
  lastMessage?: { content: string; role: string } | null;
}

export interface ProactiveMessage {
  id: string;
  message: string;
  triggerType: string;
  isRead: boolean;
  createdAt: string;
  expiresAt: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}
