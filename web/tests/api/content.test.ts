/**
 * tests/api/content.test.ts
 * ダウンロードコンテンツAPI ユニットテスト
 * - GET /api/content
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    characterSubscription: {
      findFirst: vi.fn(),
    },
    downloadableContent: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/content/route';

describe('GET /api/content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 without characterId', async () => {
    const req = new NextRequest('http://localhost/api/content');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns content without auth (non-FC)', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(prisma.downloadableContent.findMany).mockResolvedValue([
      { id: 'dc1', title: 'Wallpaper', type: 'image', fcOnly: false },
    ] as never);

    const req = new NextRequest('http://localhost/api/content?characterId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('contents');
  });

  it('returns all content for FC members', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.characterSubscription.findFirst).mockResolvedValue({ id: 's1', status: 'ACTIVE' } as never);
    vi.mocked(prisma.downloadableContent.findMany).mockResolvedValue([
      { id: 'dc1', title: 'FC Wallpaper', type: 'image', fcOnly: true },
      { id: 'dc2', title: 'Free Wallpaper', type: 'image', fcOnly: false },
    ] as never);

    const req = new NextRequest('http://localhost/api/content?characterId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isFanclub).toBe(true);
  });
});
