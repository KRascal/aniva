/**
 * tests/api/feedback.test.ts
 * フィードバックAPI ユニットテスト
 * - POST /api/feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/feedback/route';

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ characterId: 'c1', aiResponse: 'test', type: 'out_of_character' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 without required fields', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ type: 'other' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates feedback successfully', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never);

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ characterId: 'c1', aiResponse: 'test response', type: 'out_of_character' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
