/**
 * tests/api/letters-api.test.ts
 * 手紙API ユニットテスト
 * - GET /api/letters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    characterSubscription: {
      findMany: vi.fn(),
    },
    letterDelivery: {
      findMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/letters/route';

describe('GET /api/letters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/letters');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns letters with auth', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([
      { characterId: 'c1' },
    ] as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).letterDelivery.findMany.mockResolvedValue([
      {
        id: 'ld1',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        letter: {
          id: 'l1',
          characterId: 'c1',
          character: { id: 'c1', name: 'Char', slug: 'char', avatarUrl: null },
          title: 'Letter title',
          content: 'Dear fan...',
          imageUrl: null,
          isFcOnly: false,
        },
      },
    ] as never);

    const req = new NextRequest('http://localhost/api/letters');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('letters');
  });
});
