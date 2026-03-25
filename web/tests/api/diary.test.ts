/**
 * tests/api/diary.test.ts
 * 日記API ユニットテスト
 * - GET /api/diary
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    characterDiary: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from '@/lib/prisma';

describe('GET /api/diary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns diaries with pagination', async () => {
    vi.mocked(prisma.characterDiary.findMany).mockResolvedValue([
      { id: 'd1', characterId: 'c1', date: new Date(), content: 'Today was fun', mood: 'happy' },
    ] as never);
    vi.mocked(prisma.characterDiary.count).mockResolvedValue(1 as never);

    const { GET } = await import('@/app/api/diary/route');
    const req = new Request('http://localhost/api/diary');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('diaries');
  });

  it('respects limit parameter', async () => {
    vi.mocked(prisma.characterDiary.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.characterDiary.count).mockResolvedValue(0 as never);

    const { GET } = await import('@/app/api/diary/route');
    const req = new Request('http://localhost/api/diary?limit=5&page=2');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
