/**
 * tests/api/push.test.ts
 * Push通知サブスクリプションAPI ユニットテスト
 * - POST /api/push/subscribe
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    pushSubscription: {
      upsert: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/push/subscribe/route';

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example.com', p256dh: 'key', auth: 'secret' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 without subscription data', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'test@test.com' } } as never);

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates subscription with flat format', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'test@test.com' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', email: 'test@test.com' } as never);
    vi.mocked(prisma.pushSubscription.upsert).mockResolvedValue({ id: 'ps1' } as never);

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example.com', p256dh: 'key123', auth: 'secret123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('creates subscription with nested format', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', email: 'test@test.com' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as never);
    vi.mocked(prisma.pushSubscription.upsert).mockResolvedValue({ id: 'ps1' } as never);

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: 'https://push.example.com', keys: { p256dh: 'key', auth: 'secret' } } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
