/**
 * tests/api/daily-bonus.test.ts
 * デイリーログインボーナスAPI ユニットテスト
 * - POST /api/daily-bonus
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    coinTransaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    coinBalance: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    streak: {
      upsert: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { apiLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/daily-bonus/route';

describe('POST /api/daily-bonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiLimiter.check).mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60000 } as never);
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns already claimed when bonus already received today', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as never);
    vi.mocked(prisma.coinTransaction.findFirst).mockResolvedValue({ id: 'ct1', userId: 'u1', type: 'BONUS' } as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alreadyClaimed).toBe(true);
  });
});
