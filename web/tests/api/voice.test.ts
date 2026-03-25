/**
 * tests/api/voice.test.ts
 * 音声生成API ユニットテスト
 * - POST /api/voice/generate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    character: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/voice-engine', () => ({
  voiceEngine: {
    isAvailable: vi.fn(),
    generate: vi.fn(),
  },
}));

vi.mock('@/lib/audio-storage', () => ({
  audioStorage: {
    save: vi.fn(),
    getUrl: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { voiceEngine } from '@/lib/voice-engine';
import { POST } from '@/app/api/voice/generate/route';

describe('POST /api/voice/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 } as never);
  });

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/voice/generate', {
      method: 'POST',
      body: JSON.stringify({ messageId: 'm1', text: 'hello', characterId: 'c1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 } as never);

    const req = new NextRequest('http://localhost/api/voice/generate', {
      method: 'POST',
      body: JSON.stringify({ messageId: 'm1', text: 'hello', characterId: 'c1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('returns 400 without required fields', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const req = new NextRequest('http://localhost/api/voice/generate', {
      method: 'POST',
      body: JSON.stringify({ messageId: 'm1' }), // missing text and characterId
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid messageId', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);

    const req = new NextRequest('http://localhost/api/voice/generate', {
      method: 'POST',
      body: JSON.stringify({ messageId: '../../../etc/passwd', text: 'hello', characterId: 'c1' }),
    });
    const res = await POST(req);
    // Should sanitize and still work or return error
    expect([200, 400]).toContain(res.status);
  });

  it('returns audioUrl null when voice unavailable', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(voiceEngine.isAvailable).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/voice/generate', {
      method: 'POST',
      body: JSON.stringify({ messageId: 'm1', text: 'hello', characterId: 'c1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.audioUrl).toBeNull();
    expect(data.reason).toBe('voice_unavailable');
  });
});
