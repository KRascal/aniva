/**
 * tests/api/coins-packages.test.ts
 * コインパッケージAPI ユニットテスト
 * - GET /api/coins/packages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    coinPackage: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/coins/packages/route';

describe('GET /api/coins/packages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns packages from DB when available', async () => {
    const dbPkgs = [
      { id: 'p1', name: 'お試し', coinAmount: 500, priceWebJpy: 500 },
      { id: 'p2', name: '通常', coinAmount: 1050, priceWebJpy: 1000 },
      { id: 'p3', name: 'お得', coinAmount: 3300, priceWebJpy: 3000 },
    ];
    vi.mocked(prisma.coinPackage.findMany).mockResolvedValue(dbPkgs as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.packages).toHaveLength(3);
    expect(data.packages[0]).toHaveProperty('bonus');
    expect(data.packages[0]).toHaveProperty('popular');
    expect(data.packages[0]).toHaveProperty('callMinutes');
  });

  it('returns fallback packages when DB is empty', async () => {
    vi.mocked(prisma.coinPackage.findMany).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.packages).toHaveLength(4);
    expect(data.packages[0].id).toBe('trial');
    expect(data.packages[2].popular).toBe(true);
  });

  it('calculates bonus and popular correctly', async () => {
    const dbPkgs = [
      { id: 'a', name: 'A', coinAmount: 500, priceWebJpy: 500 },
      { id: 'b', name: 'B', coinAmount: 1000, priceWebJpy: 1000 },
      { id: 'c', name: 'C', coinAmount: 3000, priceWebJpy: 3000 },
      { id: 'd', name: 'D', coinAmount: 10000, priceWebJpy: 10000 },
    ];
    vi.mocked(prisma.coinPackage.findMany).mockResolvedValue(dbPkgs as never);

    const res = await GET();
    const data = await res.json();
    expect(data.packages[0].bonus).toBe(0);
    expect(data.packages[1].bonus).toBe(5);
    expect(data.packages[2].bonus).toBe(10);
    expect(data.packages[2].popular).toBe(true);
    expect(data.packages[3].bonus).toBe(20);
  });

  it('calculates callMinutes from coinAmount', async () => {
    const dbPkgs = [{ id: 'x', name: 'X', coinAmount: 600, priceWebJpy: 600 }];
    vi.mocked(prisma.coinPackage.findMany).mockResolvedValue(dbPkgs as never);

    const res = await GET();
    const data = await res.json();
    expect(data.packages[0].callMinutes).toBe(10); // 600/60
  });

  it('returns 500 on DB error', async () => {
    vi.mocked(prisma.coinPackage.findMany).mockRejectedValue(new Error('DB down'));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});
