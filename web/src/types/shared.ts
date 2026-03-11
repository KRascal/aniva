/**
 * 共有型定義
 * 
 * ページコンポーネント間で重複している型をここに集約する。
 * 新しいページを作る場合はここからimportする。
 * 
 * 注意: 既存ページの型は段階的に置換する（一括置換すると壊れるリスク）
 */

// ─── Character ───────────────────────────────────────────────────

/** フロントエンド共通 Character 型（API /api/characters のレスポンス） */
export interface CharacterBase {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

/** 詳細 Character 型 */
export interface CharacterFull extends CharacterBase {
  nameEn: string;
  franchise: string;
  franchiseEn?: string;
  description?: string;
  coverUrl: string | null;
  catchphrases: string[];
  personalityTraits?: PersonalityTrait[] | string[];
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  fcOverageCallCoinPerMin: number;
  birthday?: string | null;
}

/** 管理画面 Character 型（一覧用） */
export interface CharacterAdmin extends CharacterBase {
  nameEn?: string;
  franchise?: string;
  isPublished?: boolean;
}

// ─── Personality ─────────────────────────────────────────────────

export interface PersonalityTrait {
  trait: string;
  value: number;
}

/** DB の string[] を PersonalityTrait[] に変換するユーティリティ */
export function normalizePersonalityTraits(
  raw: (string | PersonalityTrait)[] | null | undefined,
): PersonalityTrait[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((t, i) => {
    if (typeof t === 'object' && t !== null && 'trait' in t && 'value' in t) {
      return t as PersonalityTrait;
    }
    return { trait: String(t), value: Math.max(55, 95 - i * 8) };
  });
}

// ─── Relationship ────────────────────────────────────────────────

export interface RelationshipInfo {
  characterId: string;
  level: number;
  experiencePoints: number;
  totalMessages: number;
  lastMessageAt: string | null;
  isFollowing: boolean;
  isFanclub: boolean;
  isPinned: boolean;
  isMuted: boolean;
  pinnedAt?: string | null;
  streakDays?: number;
}

// ─── User ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  birthday: string | null;
  profilePublic: boolean;
}

// ─── Pagination ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
