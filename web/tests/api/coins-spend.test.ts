/**
 * tests/api/coins-spend.test.ts
 * コイン消費API ユニットテスト
 * - POST /api/coins/spend
 * - 認証チェック
 * - 残高チェック
 * - 冪等性キー
 * - freeBalance優先消費
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth Helpers モック ────────────────────────────────────────────────────────
vi.mock('@/lib/auth-helpers', () => ({
  getVerifiedUserId: vi.fn(),
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
    coinTransaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    coinBalance: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

import { getVerifiedUserId } from '@/lib/auth-helpers';
import { paymentLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/coins/spend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupDefaultMocks(userId = 'user1') {
  vi.mocked(getVerifiedUserId).mockResolvedValue(userId);
  vi.mocked(paymentLimiter.check).mockResolvedValue({
    success: true,
    remaining: 4,
    resetAt: Date.now() + 60000,
  });
  vi.mocked(prisma.coinTransaction.findFirst).mockResolvedValue(null); // 冪等性: 初回
}

// ─────────────────────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/coins/spend', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/coins/spend/route');
    POST = mod.POST;
  });

  // ── 認証 ──────────────────────────────────────────────────────────────────
  it('未認証 → 401', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue(null);

    const req = makeRequest({
      amount: 100,
      type: 'GACHA',
      idempotencyKey: 'key1',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  // ── レート制限 ──────────────────────────────────────────────────────────
  it('レート制限超過 → 429', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    vi.mocked(paymentLimiter.check).mockResolvedValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const req = makeRequest({
      amount: 100,
      type: 'GACHA',
      idempotencyKey: 'key1',
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // ── バリデーション ─────────────────────────────────────────────────────
  it('amount が 0 以下 → 400', async () => {
    setupDefaultMocks();

    const req = makeRequest({
      amount: 0,
      type: 'GACHA',
      idempotencyKey: 'key1',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid amount/i);
  });

  it('amount が負数 → 400', async () => {
    setupDefaultMocks();

    const req = makeRequest({
      amount: -50,
      type: 'GACHA',
      idempotencyKey: 'key1',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('idempotencyKey 未指定 → 400', async () => {
    setupDefaultMocks();

    const req = makeRequest({
      amount: 100,
      type: 'GACHA',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/idempotencyKey/i);
  });

  // ── 冪等性 ─────────────────────────────────────────────────────────────
  it('既に処理済みの冪等性キー → 重複実行せず残高を返す', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.coinTransaction.findFirst).mockResolvedValue({
      id: 'tx_existing',
      userId: 'user1',
      refId: 'key_dup',
    } as any);
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      balance: 500,
      freeBalance: 200,
      paidBalance: 300,
    } as any);

    const req = makeRequest({
      amount: 100,
      type: 'GACHA',
      idempotencyKey: 'key_dup',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.skipped).toBe(true);
    expect(body.balance).toBe(500);
    // $transaction は呼ばれない
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ── コイン不足 ─────────────────────────────────────────────────────────
  it('コイン残高不足 → 402', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('INSUFFICIENT_COINS'));

    const req = makeRequest({
      amount: 1000,
      type: 'GACHA',
      idempotencyKey: 'key_insufficient',
    });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('INSUFFICIENT_COINS');
  });

  // ── 正常系 ─────────────────────────────────────────────────────────────
  it('正常系: コイン消費成功 → 200', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.$transaction).mockResolvedValue({
      newBalance: 400,
      transactionId: 'tx_new123',
    });

    const req = makeRequest({
      amount: 100,
      type: 'GACHA',
      idempotencyKey: 'key_success',
      description: 'ガチャ消費',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.balance).toBe(400);
    expect(body.transactionId).toBe('tx_new123');
  });

  it('characterId 付きで消費できる', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.$transaction).mockResolvedValue({
      newBalance: 890,
      transactionId: 'tx_chat123',
    });

    const req = makeRequest({
      amount: 10,
      type: 'CHAT_EXTRA',
      idempotencyKey: 'key_chat',
      characterId: 'char_luffy',
      description: 'チャット送信',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── DB エラー ──────────────────────────────────────────────────────────
  it('DB エラー → 500', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB connection failed'));

    const req = makeRequest({
      amount: 100,
      type: 'GACHA',
      idempotencyKey: 'key_dberr',
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });
});
