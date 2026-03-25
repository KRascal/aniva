/**
 * tests/api/community.test.ts
 * コミュニティ掲示板API ユニットテスト
 * - GET /api/community/[characterSlug]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    fanThread: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/resolve-character', () => ({
  resolveCharacterId: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { resolveCharacterId } from '@/lib/resolve-character';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/community/[characterSlug]/route';

describe('GET /api/community/[characterSlug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for invalid slug', async () => {
    vi.mocked(resolveCharacterId).mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/community/nonexist');
    const res = await GET(req, { params: Promise.resolve({ characterSlug: 'nonexist' }) });
    expect(res.status).toBe(404);
  });

  it('returns threads with pagination', async () => {
    vi.mocked(resolveCharacterId).mockResolvedValue('c1' as never);
    vi.mocked(prisma.fanThread.findMany).mockResolvedValue([
      { id: 't1', title: 'Test', characterId: 'c1', userId: 'u1', user: { id: 'u1', nickname: 'user', displayName: null, avatarUrl: null, image: null }, _count: { replies: 3 } },
    ] as never);
    vi.mocked(prisma.fanThread.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: 'c1', name: 'Chopper', slug: 'chopper', avatarUrl: null } as never);

    const req = new NextRequest('http://localhost/api/community/chopper');
    const res = await GET(req, { params: Promise.resolve({ characterSlug: 'chopper' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('threads');
    expect(Array.isArray(data.threads)).toBe(true);
    expect(data).toHaveProperty('pagination');
  });
});
