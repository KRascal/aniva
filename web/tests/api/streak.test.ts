/**
 * tests/api/streak.test.ts
 * ストリーク・デイリーボーナスAPI ユニットテスト
 * - POST /api/streak/recover: ストリーク回復（コイン消費）
 * - POST /api/daily-bonus: デイリーボーナス取得
 * - 未認証 → 401
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── Auth Helpers モック ────────────────────────────────────────────────────────
vi.mock('@/lib/auth-helpers', () => ({
  getVerifiedUserId: vi.fn(),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
    coinTransaction: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    coinBalance: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// ── Streak System モック ───────────────────────────────────────────────────────
vi.mock('@/lib/streak-system', () => ({
  recoverStreak: vi.fn(),
}));

// ── Rate Limit モック ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  apiLimiter: {
    check: vi.fn(),
  },
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// ── Logger モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { recoverStreak } from '@/lib/streak-system';
import { apiLimiter } from '@/lib/rate-limit';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(url: string, body?: object, method = 'POST') {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/streak/recover
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/streak/recover', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/streak/recover/route');
    POST = mod.POST;
  });

  it('未認証 → 401', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue(null);
    const req = makeRequest('/api/streak/recover', { relationshipId: 'rel1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('relationshipId未指定 → 400', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    const req = makeRequest('/api/streak/recover', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('relationshipId required');
  });

  it('正常系: ストリーク回復 → 200', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    vi.mocked(recoverStreak).mockResolvedValue({
      success: true,
      newStreak: 7,
    } as any);

    const req = makeRequest('/api/streak/recover', { relationshipId: 'rel1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.newStreak).toBe(7);
    expect(body.coinsSpent).toBe(50); // RECOVERY_COST
    expect(body.message).toContain('ストリーク復活');
  });

  it('リレーションが見つからない → 404', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    vi.mocked(recoverStreak).mockResolvedValue({
      success: false,
      error: 'relationship_not_found',
    } as any);

    const req = makeRequest('/api/streak/recover', { relationshipId: 'nonexistent' });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('relationship_not_found');
  });

  it('ストリークが切れていない → 400', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    vi.mocked(recoverStreak).mockResolvedValue({
      success: false,
      error: 'streak_not_broken',
    } as any);

    const req = makeRequest('/api/streak/recover', { relationshipId: 'rel1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('streak_not_broken');
  });

  it('コイン不足 → 402', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    vi.mocked(recoverStreak).mockResolvedValue({
      success: false,
      error: 'insufficient_coins',
    } as any);

    const req = makeRequest('/api/streak/recover', { relationshipId: 'rel1' });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('insufficient_coins');
    expect(body.coinsSpent).toBe(0);
  });

  it('recoverStreakがuserIdと共に呼ばれる', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    vi.mocked(recoverStreak).mockResolvedValue({
      success: true,
      newStreak: 5,
    } as any);

    const req = makeRequest('/api/streak/recover', { relationshipId: 'rel1' });
    await POST(req);
    expect(recoverStreak).toHaveBeenCalledWith('rel1', 'user1', 50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/daily-bonus
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/daily-bonus', () => {
  let POST: () => Promise<Response>;

  function setupDailyBonusMocks(opts: {
    userId?: string;
    alreadyClaimed?: boolean;
    yesterdayBonus?: boolean;
    streak?: number;
  } = {}) {
    const { userId = 'user1', alreadyClaimed = false, yesterdayBonus = false } = opts;

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: userId } as any);
    vi.mocked(apiLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 } as any);

    if (alreadyClaimed) {
      // 今日のボーナスを既に受け取り済み
      vi.mocked(prisma.coinTransaction.findFirst).mockResolvedValue({ id: 'tx1' } as any);
    } else {
      // 今日未受け取り / 昨日のボーナス有無
      vi.mocked(prisma.coinTransaction.findFirst)
        .mockResolvedValueOnce(null) // 今日のボーナスチェック → なし
        .mockResolvedValueOnce(yesterdayBonus ? { id: 'tx_yesterday' } as any : null) // 昨日のボーナス
        .mockResolvedValueOnce(null); // ウェルカムボーナスチェック

      if (yesterdayBonus) {
        // ストリーク継続: 過去のボーナス履歴
        vi.mocked(prisma.coinTransaction.findMany).mockResolvedValue([]);
      }

      vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({
        userId,
        balance: 510,
        freeBalance: 510,
        paidBalance: 0,
      } as any);
      vi.mocked(prisma.coinTransaction.create).mockResolvedValue({ id: 'tx_new' } as any);
      vi.mocked(prisma.coinTransaction.count).mockResolvedValue(1); // 初回扱い
      vi.mocked(prisma.coinBalance.update).mockResolvedValue({
        userId,
        balance: 1010,
        freeBalance: 1010,
        paidBalance: 0,
      } as any);
      vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    }
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/daily-bonus/route');
    POST = mod.POST;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('ユーザーが存在しない → 401', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'ghost_user' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('正常系: デイリーボーナス受け取り → 200', async () => {
    setupDailyBonusMocks();
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyClaimed).toBe(false);
    expect(body.awarded).toBe(true);
    expect(body.coins).toBeGreaterThan(0);
    expect(body.streak).toBeGreaterThanOrEqual(1);
    expect(body.message).toBeTruthy();
  });

  it('既にボーナス受け取り済み → alreadyClaimed: true', async () => {
    setupDailyBonusMocks({ alreadyClaimed: true });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyClaimed).toBe(true);
    expect(body.message).toContain('もう受け取った');
  });

  it('レート制限超過 → 429', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    vi.mocked(apiLimiter.check).mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 30000 } as any);

    const res = await POST();
    expect(res.status).toBe(429);
  });

  it('初回ログインボーナス（ウェルカムボーナス500コイン）が付与される', async () => {
    setupDailyBonusMocks({ yesterdayBonus: false });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isFirstLogin).toBe(true);
    expect(body.welcomeAmount).toBe(500);
  });

  it('昨日もログインしていた場合ストリーク継続', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    vi.mocked(apiLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 } as any);

    // 今日のボーナスチェック → なし
    vi.mocked(prisma.coinTransaction.findFirst)
      .mockResolvedValueOnce(null) // 今日のボーナスなし
      .mockResolvedValueOnce({ id: 'tx_yesterday' } as any) // 昨日のボーナスあり
      .mockResolvedValueOnce(null); // ウェルカムボーナスチェック

    // 過去ボーナス履歴（ストリーク計算用）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    vi.mocked(prisma.coinTransaction.findMany).mockResolvedValue([
      { id: 'tx_prev', createdAt: yesterday },
    ] as any);

    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({
      userId: 'user1', balance: 20, freeBalance: 20, paidBalance: 0,
    } as any);
    vi.mocked(prisma.coinTransaction.create).mockResolvedValue({ id: 'tx_new' } as any);
    vi.mocked(prisma.coinTransaction.count).mockResolvedValue(5); // 初回ではない
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBeGreaterThanOrEqual(2); // 2日以上のストリーク
    expect(body.alreadyClaimed).toBe(false);
    expect(body.isFirstLogin).toBe(false);
  });

  it('DBエラー → 500', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    vi.mocked(apiLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 } as any);
    vi.mocked(prisma.coinTransaction.findFirst).mockRejectedValue(new Error('DB error'));

    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });
});
