/**
 * tests/api/gacha.test.ts
 * ガチャAPI ユニットテスト
 * - POST /api/gacha/pull 正常系
 * - 天井システムの動作確認
 * - コイン残高不足時のエラー
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── Rate Limit モック ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  gachaLimiter: {
    check: vi.fn(),
  },
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    gachaBanner: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    coinBalance: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    userGachaPity: {
      findUnique: vi.fn(),
    },
  },
}));

// ── Gacha System モック ────────────────────────────────────────────────────────
vi.mock('@/lib/gacha-system', () => ({
  pullGacha: vi.fn(),
  getFreeGachaAvailable: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { gachaLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { pullGacha, getFreeGachaAvailable } from '@/lib/gacha-system';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/gacha/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** デフォルトのモックカード結果 */
const mockPullResult = [
  {
    card: { id: 'card1', name: 'Luffy N', rarity: 'N', characterId: 'char1', description: null, imageUrl: null },
    isNew: true,
    rarity: 'N',
    pityInfo: { current: 1, ceiling: 100, remaining: 99 },
  },
];

/** デフォルトの天井情報 */
const defaultPityRecord = { pullCount: 5, userId: 'user1', bannerId: 'banner1' };
const defaultBanner = { id: 'banner1', name: 'Test Banner', ceilingCount: 100 };

// ─────────────────────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/gacha/pull', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/gacha/pull/route');
    POST = mod.POST;
  });

  // 未認証 ──────────────────────────────────────────────────────────────────
  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  // レート制限 ───────────────────────────────────────────────────────────────
  it('レート制限超過 → 429', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 60000 });
    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // バリデーション ───────────────────────────────────────────────────────────
  it('bannerId 未指定 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    const req = makeRequest({ count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid request/i);
  });

  it('count 未指定 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    const req = makeRequest({ bannerId: 'banner1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('count が不正な値 (5) → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({ userId: 'user1', balance: 1000, freeBalance: 500, paidBalance: 500 } as any);
    const req = makeRequest({ bannerId: 'banner1', count: 5 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid count/i);
  });

  // ガチャテーブル未準備 ──────────────────────────────────────────────────────
  it('ガチャテーブルが存在しない → 503', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockRejectedValue(new Error('Table does not exist'));
    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain('準備中');
  });

  // コイン不足 ──────────────────────────────────────────────────────────────
  it('コイン残高不足 (1連: cost=100, balance=50) → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({
      userId: 'user1', balance: 50, freeBalance: 25, paidBalance: 25,
    } as any);
    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('コイン');
    expect(body.required).toBe(100);
    expect(body.current).toBe(50);
  });

  it('コイン残高不足 (10連: cost=900, balance=800) → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({
      userId: 'user1', balance: 800, freeBalance: 400, paidBalance: 400,
    } as any);
    const req = makeRequest({ bannerId: 'banner1', count: 10 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.required).toBe(900);
    expect(body.current).toBe(800);
  });

  // 正常系 ──────────────────────────────────────────────────────────────────
  it('正常系 1連ガチャ → 200 でカード結果を返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({
      userId: 'user1', balance: 500, freeBalance: 250, paidBalance: 250,
    } as any);
    vi.mocked(prisma.coinBalance.update).mockResolvedValue({
      userId: 'user1', balance: 400, freeBalance: 250, paidBalance: 150,
    } as any);
    vi.mocked(pullGacha).mockResolvedValue(mockPullResult as any);
    vi.mocked(prisma.userGachaPity.findUnique).mockResolvedValue(defaultPityRecord as any);
    vi.mocked(prisma.gachaBanner.findUnique).mockResolvedValue(defaultBanner as any);

    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.coinBalance).toBe(400);
    expect(body.pityProgress).toBeTruthy();
  });

  it('正常系 10連ガチャ → 200 で10枚のカード結果を返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({
      userId: 'user1', balance: 1000, freeBalance: 500, paidBalance: 500,
    } as any);
    vi.mocked(prisma.coinBalance.update).mockResolvedValue({
      userId: 'user1', balance: 100, freeBalance: 100, paidBalance: 0,
    } as any);
    const tenResults = Array(10).fill(mockPullResult[0]);
    vi.mocked(pullGacha).mockResolvedValue(tenResults as any);
    vi.mocked(prisma.userGachaPity.findUnique).mockResolvedValue({ pullCount: 15, userId: 'user1', bannerId: 'banner1' } as any);
    vi.mocked(prisma.gachaBanner.findUnique).mockResolvedValue(defaultBanner as any);

    const req = makeRequest({ bannerId: 'banner1', count: 10 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(10);
    expect(body.coinBalance).toBe(100);
  });

  // 天井システム ─────────────────────────────────────────────────────────────
  it('天井進捗が正しく含まれる (pityProgress)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({ userId: 'user1', balance: 500 } as any);
    vi.mocked(prisma.coinBalance.update).mockResolvedValue({ userId: 'user1', balance: 400 } as any);
    vi.mocked(pullGacha).mockResolvedValue(mockPullResult as any);
    // 天井に近い状態（99回引いた）
    vi.mocked(prisma.userGachaPity.findUnique).mockResolvedValue({ pullCount: 99 } as any);
    vi.mocked(prisma.gachaBanner.findUnique).mockResolvedValue({ id: 'banner1', ceilingCount: 100 } as any);

    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pityProgress.current).toBe(99);
    expect(body.pityProgress.ceiling).toBe(100);
    expect(body.pityProgress.guaranteedRarity).toBe('UR');
  });

  it('天井レコードが存在しない場合 → pityProgress.current = 0', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({ userId: 'user1', balance: 500 } as any);
    vi.mocked(prisma.coinBalance.update).mockResolvedValue({ userId: 'user1', balance: 400 } as any);
    vi.mocked(pullGacha).mockResolvedValue(mockPullResult as any);
    vi.mocked(prisma.userGachaPity.findUnique).mockResolvedValue(null); // 天井レコードなし
    vi.mocked(prisma.gachaBanner.findUnique).mockResolvedValue({ id: 'banner1', ceilingCount: 100 } as any);

    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pityProgress.current).toBe(0);
  });

  // ガチャ失敗時のコインロールバック ─────────────────────────────────────────
  it('pullGacha失敗時 → コインが返還される (increment)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({ userId: 'user1', balance: 500 } as any);
    vi.mocked(prisma.coinBalance.update)
      .mockResolvedValueOnce({ userId: 'user1', balance: 400 } as any) // 初回: デクリメント
      .mockResolvedValueOnce({ userId: 'user1', balance: 500 } as any); // 2回目: ロールバック
    vi.mocked(pullGacha).mockRejectedValue(new Error('Gacha system error'));

    const req = makeRequest({ bannerId: 'banner1', count: 1 });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    // route は err.message をそのまま返す: 'Gacha system error'
    expect(body.error).toBeTruthy();
    // コインのロールバック (increment) が呼ばれた
    expect(prisma.coinBalance.update).toHaveBeenCalledTimes(2);
    expect(prisma.coinBalance.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { balance: { increment: 100 } } })
    );
  });

  // 無料ガチャ ───────────────────────────────────────────────────────────────
  it('無料ガチャ: 本日分が利用可能 → 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(getFreeGachaAvailable).mockResolvedValue(true);
    vi.mocked(pullGacha).mockResolvedValue(mockPullResult as any);
    vi.mocked(prisma.coinBalance.upsert).mockResolvedValue({ userId: 'user1', balance: 200 } as any);
    vi.mocked(prisma.userGachaPity.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.gachaBanner.findUnique).mockResolvedValue(defaultBanner as any);

    const req = makeRequest({ bannerId: 'banner1', count: 1, free: true });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.free).toBe(true);
    expect(body.results).toHaveLength(1);
  });

  it('無料ガチャ: 本日分が使用済み → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(gachaLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(1);
    vi.mocked(getFreeGachaAvailable).mockResolvedValue(false);

    const req = makeRequest({ bannerId: 'banner1', count: 1, free: true });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('無料ガチャ');
  });
});
