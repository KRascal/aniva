/**
 * tests/api/characters.test.ts
 * キャラクター一覧API ユニットテスト
 * - GET /api/characters 正常系/検索/フォロー絞り込み
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    character: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import { getAuthUserId } from '@/lib/api-auth';
import { GET } from '@/app/api/characters/route';

const mockCharacters = [
  { id: 'c1', name: 'テストキャラ', nameEn: 'Test Char', slug: 'test-char', franchise: 'テスト', franchiseEn: 'Test', description: 'desc', avatarUrl: null, coverUrl: null, catchphrases: [], birthday: null, voiceModelId: null, _count: { relationships: 0 } },
];

describe('GET /api/characters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findMany).mockResolvedValue(mockCharacters as never);
  });

  it('returns characters array', async () => {
    const req = new NextRequest('http://localhost/api/characters');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('characters');
    expect(Array.isArray(data.characters)).toBe(true);
  });

  it('passes search query to where clause', async () => {
    const req = new NextRequest('http://localhost/api/characters?q=chopper');
    await GET(req);
    const call = vi.mocked(prisma.character.findMany).mock.calls[0][0];
    expect(call?.where).toHaveProperty('OR');
  });

  it('returns empty array for followingOnly without auth', async () => {
    vi.mocked(getAuthUserId).mockResolvedValue(null as never);
    const req = new NextRequest('http://localhost/api/characters?followingOnly=true');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.characters).toEqual([]);
  });

  it('filters by following relationships with auth', async () => {
    vi.mocked(getAuthUserId).mockResolvedValue('user-1' as never);
    const req = new NextRequest('http://localhost/api/characters?followingOnly=true');
    await GET(req);
    const call = vi.mocked(prisma.character.findMany).mock.calls[0][0];
    expect(call?.where).toHaveProperty('relationships');
  });
});
