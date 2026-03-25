/**
 * tests/api/missions-api.test.ts
 * ミッションAPI ユニットテスト
 * - GET /api/missions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    coinTransaction: {
      findMany: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
    momentComment: {
      count: vi.fn(),
    },
    userStoryProgress: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/missions/route';

describe('GET /api/missions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.coinTransaction.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.message.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.momentComment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.userStoryProgress.count).mockResolvedValue(0 as never);
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns missions with auth', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    // Response structure: { missions: [...], date, weekly: { missions: [...] } }
    expect(data).toHaveProperty('missions');
    expect(data).toHaveProperty('weekly');
    expect(Array.isArray(data.missions)).toBe(true);
    expect(data.weekly).toHaveProperty('missions');

    // Each mission should have required fields
    if (data.missions.length > 0) {
      const mission = data.missions[0];
      expect(mission).toHaveProperty('id');
      expect(mission).toHaveProperty('title');
      expect(mission).toHaveProperty('coins');
      expect(mission).toHaveProperty('completed');
    }

    // Weekly missions should have target/progress
    if (data.weekly.missions.length > 0) {
      const weekly = data.weekly.missions[0];
      expect(weekly).toHaveProperty('target');
      expect(weekly).toHaveProperty('progress');
      expect(weekly).toHaveProperty('completed');
    }
  });
});
