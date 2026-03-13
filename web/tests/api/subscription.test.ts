/**
 * tests/api/subscription.test.ts
 * 課金API ユニットテスト
 * - POST /api/subscription/create
 * - POST /api/fc/subscribe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
    },
    characterSubscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
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

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── インポート（モック後） ─────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/auth';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(body: object, url = 'http://localhost/api/subscription/create') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// /api/subscription/create
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/subscription/create', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to pick up fresh mocks each test
    const mod = await import('@/app/api/subscription/create/route');
    POST = mod.POST;
  });

  it('必須フィールド欠如 → 400', async () => {
    const req = makeRequest({ userId: 'u1' }); // plan, priceId 欠如
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/i);
  });

  it('ユーザーが stripeCustomerId を持っている場合、新規作成しない', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com', stripeCustomerId: 'cus_existing' };
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(mockUser as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/test',
    } as any);

    const req = makeRequest({ userId: 'u1', plan: 'premium', priceId: 'price_123' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/pay/test');
    // 既存のcustomerIdがあるので customers.create は呼ばれない
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });

  it('ユーザーに stripeCustomerId がない場合、Stripe Customer を作成する', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com', stripeCustomerId: null };
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(mockUser as any);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new123' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, stripeCustomerId: 'cus_new123' } as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/new',
    } as any);

    const req = makeRequest({ userId: 'u1', plan: 'basic', priceId: 'price_456' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', metadata: { userId: 'u1' } })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stripeCustomerId: 'cus_new123' } })
    );
  });

  it('Stripe エラー → 500', async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockRejectedValue(new Error('DB error'));
    const req = makeRequest({ userId: 'u1', plan: 'premium', priceId: 'price_789' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });

  it('Checkout Session に正しいパラメータが渡される', async () => {
    const mockUser = { id: 'u1', email: 'a@b.com', stripeCustomerId: 'cus_abc' };
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(mockUser as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: 'https://checkout.stripe.com/pay/x' } as any);

    const req = makeRequest({ userId: 'u1', plan: 'premium', priceId: 'price_premium' });
    await POST(req);

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_abc',
        mode: 'subscription',
        line_items: [{ price: 'price_premium', quantity: 1 }],
        metadata: { userId: 'u1', plan: 'premium' },
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/fc/subscribe
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/fc/subscribe', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  const origEnv = { ...process.env };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Stripe Checkout フローをテストするため DEMO_MODE を無効化
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.DEMO_MODE = 'false';
    const mod = await import('@/app/api/fc/subscribe/route');
    POST = mod.POST;
  });

  afterEach(() => {
    // 環境変数を元に戻す
    if (origEnv.STRIPE_SECRET_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = origEnv.STRIPE_SECRET_KEY;
    if (origEnv.DEMO_MODE === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = origEnv.DEMO_MODE;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest({ characterId: 'char1' }, 'http://localhost/api/fc/subscribe');
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('characterId 未指定 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    const req = makeRequest({}, 'http://localhost/api/fc/subscribe');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/characterId is required/i);
  });

  it('キャラクターが存在しない → 404', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue(null);
    const req = makeRequest({ characterId: 'nonexistent' }, 'http://localhost/api/fc/subscribe');
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/Character not found/i);
  });

  it('既にFC加入済み → 409', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', name: 'Luffy', fcMonthlyPriceJpy: 3480, fcIncludedCallMin: 30, fcMonthlyCoins: 500,
    } as any);
    vi.mocked(prisma.characterSubscription.findFirst).mockResolvedValue({
      id: 'sub1', status: 'ACTIVE',
    } as any);
    const req = makeRequest({ characterId: 'char1' }, 'http://localhost/api/fc/subscribe');
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Already subscribed/i);
  });

  it('正常系: Checkout URL を返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', name: 'Luffy', fcMonthlyPriceJpy: 3480, fcIncludedCallMin: 30, fcMonthlyCoins: 500,
    } as any);
    vi.mocked(prisma.characterSubscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: 'cus_existing', email: 'user@example.com',
    } as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/fc',
    } as any);

    const req = makeRequest({ characterId: 'char1' }, 'http://localhost/api/fc/subscribe');
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/fc');
  });

  it('FC加入: Stripe Customer が未作成の場合、新規作成する', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u2' } } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', name: 'Zoro', fcMonthlyPriceJpy: 2980, fcIncludedCallMin: 20, fcMonthlyCoins: 300,
    } as any);
    vi.mocked(prisma.characterSubscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: null, email: 'newuser@example.com',
    } as any);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_newfc' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ stripeCustomerId: 'cus_newfc' } as any);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/fc2',
    } as any);

    const req = makeRequest({ characterId: 'char1' }, 'http://localhost/api/fc/subscribe');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'newuser@example.com', metadata: { userId: 'u2' } })
    );
  });
});
