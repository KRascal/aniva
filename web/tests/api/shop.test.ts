/**
 * tests/api/shop.test.ts
 * ショップAPI ユニットテスト
 * - GET /api/shop/items
 * - POST /api/shop/purchase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    shopItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    coinBalance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    coinTransaction: {
      create: vi.fn(),
    },
    shopOrder: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('GET /api/shop/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns items array', async () => {
    vi.mocked(prisma.shopItem.findMany).mockResolvedValue([
      { id: 'i1', name: 'Item 1', isActive: true, character: { id: 'c1', name: 'Char', avatarUrl: null, slug: 'char' } },
    ] as never);

    const { GET } = await import('@/app/api/shop/items/route');
    const req = new NextRequest('http://localhost/api/shop/items');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('filters by characterId', async () => {
    vi.mocked(prisma.shopItem.findMany).mockResolvedValue([] as never);

    const { GET } = await import('@/app/api/shop/items/route');
    const req = new NextRequest('http://localhost/api/shop/items?characterId=c1');
    await GET(req);
    const call = vi.mocked(prisma.shopItem.findMany).mock.calls[0][0];
    expect(call?.where).toHaveProperty('characterId', 'c1');
  });
});

describe('POST /api/shop/purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: 'i1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 without itemId', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent item', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.shopItem.findUnique).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: 'nonexist' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 for inactive item', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.shopItem.findUnique).mockResolvedValue({ id: 'i1', isActive: false, stock: null, priceCoins: 100 } as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: 'i1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for physical item without shippingAddress', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.shopItem.findUnique).mockResolvedValue({ id: 'i1', isActive: true, stock: 10, priceCoins: 100 } as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: 'i1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for out of stock physical item', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.shopItem.findUnique).mockResolvedValue({ id: 'i1', isActive: true, stock: 0, priceCoins: 100 } as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: 'i1', shippingAddress: '東京' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 402 for insufficient coins', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.shopItem.findUnique).mockResolvedValue({ id: 'i1', isActive: true, stock: null, priceCoins: 1000 } as never);
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({ userId: 'u1', freeBalance: 0, paidBalance: 50, balance: 50 } as never);

    const { POST } = await import('@/app/api/shop/purchase/route');
    const req = new NextRequest('http://localhost/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: 'i1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(402);
  });
});
