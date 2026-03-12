/* ────────────────────────────────── 型定義 ── */

export interface MomentCharacter {
  id?: string;
  name: string;
  avatarUrl: string | null;
}

export interface MomentComment {
  id: string;
  content: string;
  createdAt: string;
  characterId?: string | null;
  userId?: string | null;
  character?: { name: string; slug: string; avatarUrl: string | null } | null;
  user?: { id: string; name: string | null; email: string; displayName?: string | null; nickname?: string | null; image?: string | null } | null;
  parentCommentId?: string | null;
  replies?: MomentComment[];
  likeCount?: number;
  userHasLiked?: boolean;
}

export interface Moment {
  id: string;
  characterId: string;
  character: MomentCharacter;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  visibility: string;
  levelRequired: number;
  publishedAt: string;
  reactionCount: number;
  userHasLiked: boolean;
  isLocked: boolean;
  isFcOnly?: boolean;
  commentCount?: number;
  isFollowing?: boolean;
}

export interface FloatingHeart {
  id: number;
  x: number;
}
