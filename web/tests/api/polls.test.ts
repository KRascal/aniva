/**
 * tests/api/polls.test.ts
 * 投票API ユニットテスト
 * - GET /api/polls/active
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    storyPoll: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/polls/active/route';

describe('GET /api/polls/active', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns active polls with auth', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.storyPoll.findMany).mockResolvedValue([
      {
        id: 'p1',
        title: 'Choose adventure',
        isActive: true,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 86400000),
        choices: [{ id: 'ch1', text: 'Option A' }, { id: 'ch2', text: 'Option B' }],
        character: { id: 'c1', name: 'Char', slug: 'char', avatarUrl: null, franchise: 'Test' },
        votes: [{ choiceId: 'ch1', userId: 'u2' }],
      },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('polls');
    expect(Array.isArray(data.polls)).toBe(true);
    if (data.polls.length > 0) {
      expect(data.polls[0]).toHaveProperty('choices');
      expect(data.polls[0]).toHaveProperty('remainingHours');
    }
  });
});
