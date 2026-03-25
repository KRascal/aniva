/**
 * tests/api/group-chat.test.ts
 * グループチャットAPI ユニットテスト
 * - POST /api/group-chat
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    character: {
      findMany: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { POST } from '@/app/api/group-chat/route';

describe('POST /api/group-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/group-chat', {
      method: 'POST',
      body: JSON.stringify({ characterIds: ['c1', 'c2'], userMessage: 'hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 with less than 2 characterIds', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const req = new NextRequest('http://localhost/api/group-chat', {
      method: 'POST',
      body: JSON.stringify({ characterIds: ['c1'], userMessage: 'hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 without userMessage', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const req = new NextRequest('http://localhost/api/group-chat', {
      method: 'POST',
      body: JSON.stringify({ characterIds: ['c1', 'c2'] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
