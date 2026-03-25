/**
 * tests/api/notifications.test.ts
 * 通知API ユニットテスト
 * - GET /api/notifications
 * - POST /api/notifications (read-all)
 * - GET /api/notifications/unread-count
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/notifications/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toEqual([]);
  });

  it('returns notifications with auth', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    const mockNotifs = [
      { id: 'n1', userId: 'u1', type: 'CHAT', title: 'test', actorAvatar: 'url', characterId: null, createdAt: new Date() },
    ];
    vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifs as never);

    const { GET } = await import('@/app/api/notifications/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toHaveLength(1);
  });
});

describe('GET /api/notifications/unread-count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/notifications/unread-count/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(0);
  });

  it('returns count with auth', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.notification.count).mockResolvedValue(5 as never);

    const { GET } = await import('@/app/api/notifications/unread-count/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(5);
  });
});
