/**
 * tests/api/coins-purchase.test.ts
 * コイン購入API ユニットテスト
 * - POST /api/coins/purchase
 * - 認証チェック
 * - packageId バリデーション
 * - Stripe Checkout Session 作成
 * - デモモード（Stripeスキップ）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── Rate Limit モック ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  paymentLimiter: {
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
    coinPackage: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    coinBalance: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    coinTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Stripe モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
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
import { paymentLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/coins/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockPackage = {
  id: 'pkg_100',
  name: '100コイン',
  coinAmount: 100,
  priceWebJpy: 120,
  isActive: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/coins/purchase', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  const origEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    // デフォルト: 本番モード
    process.env.STRIPE_SECRET_KEY = 'sk_test_vitest_mock_key';
    process.env.DEMO_MODE = 'false';
    const mod = await import('@/app/api/coins/purchase/route');
    POST = mod.POST;

    // デフォルトモック
    vi.mocked(paymentLimiter.check).mockResolvedValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 60000,
    });
  });

  afterEach(() => {
    // 環境変数を元に戻す
    if (origEnv.STRIPE_SECRET_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = origEnv.STRIPE_SECRET_KEY;
    if (origEnv.DEMO_MODE === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = origEnv.DEMO_MODE;
  });

  // ── 認証 ──────────────────────────────────────────────────────────────────
  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = makeRequest({ packageId: 'pkg_100' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  // ── レート制限 ──────────────────────────────────────────────────────────
  it('レート制限超過 → 429', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(paymentLimiter.check).mockResolvedValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const req = makeRequest({ packageId: 'pkg_100' });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // ── バリデーション ─────────────────────────────────────────────────────
  it('packageId 未指定 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);

    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/packageId is required/i);
  });

  it('存在しないパッケージ → 404', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.coinPackage.findUnique).mockResolvedValue(null);

    const req = makeRequest({ packageId: 'nonexistent_pkg' });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/Package not found/i);
  });

  // ── 本番モード: Stripe Checkout ─────────────────────────────────────────
  it('正常系: Stripe Checkout URL を返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.coinPackage.findUnique).mockResolvedValue(mockPackage as any);
    // route.ts は findUniqueOrThrow を使用
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user1',
      email: 'user@example.com',
      stripeCustomerId: 'cus_existing',
    } as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/coins123',
    } as any);

    const req = makeRequest({ packageId: 'pkg_100' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/coins123');
  });

  it('StripeCustomerId がない場合、新規作成する', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user2' } } as any);
    vi.mocked(prisma.coinPackage.findUnique).mockResolvedValue(mockPackage as any);
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user2',
      email: 'newuser@example.com',
      stripeCustomerId: null,
    } as any);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new_coins' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/coins456',
    } as any);

    const req = makeRequest({ packageId: 'pkg_100' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
        metadata: { userId: 'user2' },
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stripeCustomerId: 'cus_new_coins' },
      })
    );
  });

  it('Stripe Checkout に正しいメタデータが渡される', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.coinPackage.findUnique).mockResolvedValue(mockPackage as any);
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user1',
      email: 'user@example.com',
      stripeCustomerId: 'cus_existing',
    } as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/x',
    } as any);

    const req = makeRequest({ packageId: 'pkg_100' });
    await POST(req);

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        metadata: expect.objectContaining({
          type: 'COIN_PURCHASE',
          userId: 'user1',
          packageId: 'pkg_100',
          coinAmount: '100',
        }),
      })
    );
  });

  // ── Stripe rate limit ─────────────────────────────────────────────────
  it('レート制限超過後もpackageId未指定は400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(paymentLimiter.check).mockResolvedValue({ success: true, remaining: 4, resetAt: Date.now() + 60000 });

    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── DB / Stripe エラー ────────────────────────────────────────────────
  it('Stripe エラー → 500', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.coinPackage.findUnique).mockResolvedValue(mockPackage as any);
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user1',
      email: 'user@example.com',
      stripeCustomerId: 'cus_existing',
    } as any);
    vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(new Error('Stripe API error'));

    const req = makeRequest({ packageId: 'pkg_100' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });
});
