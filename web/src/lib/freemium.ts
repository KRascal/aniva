import { prisma } from './prisma';

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface ChatAccessResult {
  type: 'FREE' | 'FC_UNLIMITED' | 'COIN_REQUIRED' | 'BLOCKED';
  freeMessagesUsed?: number;
  freeMessagesRemaining?: number;
  coinCost?: number;
}

export interface CallAccessResult {
  type: 'FREE' | 'FC_INCLUDED' | 'COIN_REQUIRED' | 'BLOCKED';
  freeMinutesUsed?: number;
  freeMinutesRemaining?: number;
  /** コイン/分 */
  coinCostPerMin?: number;
  /** FC加入済みかどうか */
  isFanclub?: boolean;
}

// ─── Usage Stats Types ──────────────────────────────────────────────────────────

interface UsageStats {
  monthly?: {
    chatCount?: number;
    callMinutes?: number;
    month?: string; // 'YYYY-MM'
  };
}

interface MemorySummary {
  usageStats?: UsageStats;
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** 現在の月キー (JST: UTC+9) */
function currentMonthKey(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC→JST
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Relationship.memorySummary から月次使用量を取得する。
 * 月が切り替わっていたら 0 を返す。
 */
export async function getMonthlyUsage(
  userId: string,
  characterId: string
): Promise<{ chatCount: number; callMinutes: number }> {
  const rel = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
    select: { memorySummary: true },
  });

  if (!rel) return { chatCount: 0, callMinutes: 0 };

  const summary = rel.memorySummary as MemorySummary;
  const stats = summary?.usageStats?.monthly;
  const thisMonth = currentMonthKey();

  if (!stats || stats.month !== thisMonth) {
    return { chatCount: 0, callMinutes: 0 };
  }

  return {
    chatCount: stats.chatCount ?? 0,
    callMinutes: stats.callMinutes ?? 0,
  };
}

/**
 * チャット送信後に月次カウントをインクリメントする。
 * Relationship が存在しない場合は何もしない。
 */
export async function incrementMonthlyChat(
  userId: string,
  characterId: string
): Promise<void> {
  const rel = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
    select: { id: true, memorySummary: true },
  });

  if (!rel) return;

  const thisMonth = currentMonthKey();
  const summary = (rel.memorySummary as MemorySummary) ?? {};
  const stats = summary.usageStats ?? {};
  const monthly = stats.monthly?.month === thisMonth ? stats.monthly : { month: thisMonth };

  const updated: MemorySummary = {
    ...summary,
    usageStats: {
      ...stats,
      monthly: {
        ...monthly,
        chatCount: (monthly.chatCount ?? 0) + 1,
        callMinutes: monthly.callMinutes ?? 0,
      },
    },
  };

  await prisma.relationship.update({
    where: { id: rel.id },
    data: { memorySummary: updated as object },
  });
}

/**
 * 通話終了後に月次通話時間をインクリメントする。
 */
export async function incrementMonthlyCallMinutes(
  userId: string,
  characterId: string,
  minutes: number
): Promise<void> {
  if (minutes <= 0) return;

  const rel = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
    select: { id: true, memorySummary: true },
  });

  if (!rel) return;

  const thisMonth = currentMonthKey();
  const summary = (rel.memorySummary as MemorySummary) ?? {};
  const stats = summary.usageStats ?? {};
  const monthly = stats.monthly?.month === thisMonth ? stats.monthly : { month: thisMonth };

  const updated: MemorySummary = {
    ...summary,
    usageStats: {
      ...stats,
      monthly: {
        ...monthly,
        chatCount: monthly.chatCount ?? 0,
        callMinutes: (monthly.callMinutes ?? 0) + minutes,
      },
    },
  };

  await prisma.relationship.update({
    where: { id: rel.id },
    data: { memorySummary: updated as object },
  });
}

// ─── Access Checks ──────────────────────────────────────────────────────────────

/**
 * チャットアクセス判定
 *
 * 優先度:
 * 1. CharacterSubscription ACTIVE → FC_UNLIMITED
 * 2. 月次チャット数 < freeMessageLimit → FREE
 * 3. CoinBalance >= 10 → COIN_REQUIRED (coinCost: 10)
 * 4. → BLOCKED
 */
export async function checkChatAccess(
  userId: string,
  characterId: string
): Promise<ChatAccessResult> {
  // 0. 新規ユーザー3日間無制限（沼に落とす猶予期間）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (user) {
    const daysSinceSignup = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceSignup < 3) {
      return { type: 'FREE', freeMessagesUsed: 0, freeMessagesRemaining: 999 };
    }
  }

  // 1. FC加入チェック
  const sub = await prisma.characterSubscription.findFirst({
    where: { userId, characterId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (sub) {
    return { type: 'FC_UNLIMITED' };
  }

  // キャラクターの無料上限を取得
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { freeMessageLimit: true },
  });

  const freeLimit = character?.freeMessageLimit ?? 10;

  // 2. 月次使用量チェック
  const { chatCount } = await getMonthlyUsage(userId, characterId);

  if (chatCount < freeLimit) {
    return {
      type: 'FREE',
      freeMessagesUsed: chatCount,
      freeMessagesRemaining: freeLimit - chatCount,
    };
  }

  // 3. コイン残高チェック
  const coin = await prisma.coinBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });

  const balance = coin?.balance ?? 0;

  if (balance >= 10) {
    return { type: 'COIN_REQUIRED', coinCost: 10 };
  }

  // 4. ブロック
  return { type: 'BLOCKED' };
}

/**
 * 通話アクセス判定
 *
 * 優先度:
 * 1. CharacterSubscription ACTIVE → callMinutesRemaining > 0 → FC_INCLUDED
 *    それ以外 → COIN_REQUIRED (fcOverageCallCoinPerMin)
 * 2. 月次通話時間 < freeCallMinutes → FREE
 * 3. CoinBalance >= callCoinPerMin → COIN_REQUIRED (callCoinPerMin)
 * 4. → BLOCKED
 */
export async function checkCallAccess(
  userId: string,
  characterId: string
): Promise<CallAccessResult> {
  // キャラクター情報を取得
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      freeCallMinutes: true,
      callCoinPerMin: true,
      fcOverageCallCoinPerMin: true,
    },
  });

  const freeCallMinutes = character?.freeCallMinutes ?? 5;
  const callCoinPerMin = character?.callCoinPerMin ?? 200;
  const fcOverageCoinPerMin = character?.fcOverageCallCoinPerMin ?? 100;

  // 1. FC加入チェック
  const sub = await prisma.characterSubscription.findFirst({
    where: { userId, characterId, status: 'ACTIVE' },
    select: { callMinutesRemaining: true },
  });

  if (sub) {
    if (sub.callMinutesRemaining > 0) {
      return {
        type: 'FC_INCLUDED',
        isFanclub: true,
      };
    }
    // FC加入済みだが込み分を使い切った → 超過料金
    const coin = await prisma.coinBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });
    const balance = coin?.balance ?? 0;
    if (balance >= fcOverageCoinPerMin) {
      return {
        type: 'COIN_REQUIRED',
        coinCostPerMin: fcOverageCoinPerMin,
        isFanclub: true,
      };
    }
    return { type: 'BLOCKED', isFanclub: true };
  }

  // 2. 無料通話チェック
  const { callMinutes } = await getMonthlyUsage(userId, characterId);

  if (callMinutes < freeCallMinutes) {
    return {
      type: 'FREE',
      freeMinutesUsed: callMinutes,
      freeMinutesRemaining: freeCallMinutes - callMinutes,
      isFanclub: false,
    };
  }

  // 3. コイン残高チェック
  const coin = await prisma.coinBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });

  const balance = coin?.balance ?? 0;

  if (balance >= callCoinPerMin) {
    return {
      type: 'COIN_REQUIRED',
      coinCostPerMin: callCoinPerMin,
      isFanclub: false,
    };
  }

  // 4. ブロック
  return { type: 'BLOCKED', isFanclub: false };
}
