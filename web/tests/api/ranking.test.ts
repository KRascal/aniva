/**
 * tests/api/ranking.test.ts
 * ランキングAPI ユニットテスト
 * - GET /api/ranking
 * - GET /api/ranking/characters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    rankingScore: {
      findMany: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  };
  return { prisma: mockPrisma };
});

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from '@/lib/prisma';

describe('GET /api/ranking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rankings object', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).rankingScore.findMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/ranking/route');
    const req = new NextRequest('http://localhost/api/ranking');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('rankings');
  });

  it('accepts period parameter', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).rankingScore.findMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/ranking/route');
    const req = new NextRequest('http://localhost/api/ranking?period=weekly');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/ranking/characters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ranking array', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).$queryRawUnsafe.mockResolvedValue([]);
    (prisma as any).character.findMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/ranking/characters/route');
    const req = new NextRequest('http://localhost/api/ranking/characters');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('ranking');
    expect(Array.isArray(data.ranking)).toBe(true);
  });
});
