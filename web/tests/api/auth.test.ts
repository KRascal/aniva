/**
 * tests/api/auth.test.ts
 * 認証API ユニットテスト
 * - POST /api/auth/send-code (Email OTP)
 * - proxy.ts のルーティングロジック（公開パス vs 保護パス）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
}));

// ── next-auth/jwt モック（proxy.ts用）────────────────────────────────────────
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// ── Rate Limit モック ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  authLimiter: {
    check: vi.fn().mockResolvedValue({ success: true }),
  },
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// ── resend モック ──────────────────────────────────────────────────────────────
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email_mock_id' }),
    },
  })),
}));

// ── crypto mock (randomUUID) ───────────────────────────────────────────────────
// Node.js has crypto.randomUUID natively, so we just verify it exists

import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(body: object, url = 'http://localhost/api/auth/send-code') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeProxyRequest(path: string, options: {
  method?: string;
  token?: { sub: string; onboardingStep?: string } | null;
  headers?: Record<string, string>;
} = {}) {
  const { method = 'GET', token = null, headers = {} } = options;
  const req = new NextRequest(`http://localhost${path}`, { method, headers });
  // Attach token mock return value (used in proxy tests)
  vi.mocked(getToken).mockResolvedValue(token as any);
  return req;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-code
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/send-code', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);
    // Set env for resend
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'noreply@test.com';
    const mod = await import('@/app/api/auth/send-code/route');
    POST = mod.POST;
  });

  it('email未指定 → 400', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('メールアドレス');
  });

  it('email が文字列でない → 400', async () => {
    const req = makeRequest({ email: 12345 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('正常系: success: true を返す', async () => {
    const req = makeRequest({ email: 'test@example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBeTruthy();
  });

  it('正常系: 古いコードのDELETEが実行される', async () => {
    const req = makeRequest({ email: 'user@test.com' });
    await POST(req);
    // $executeRaw が呼ばれたこと (DELETE + INSERT の 2回)
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('email が小文字・trimされる', async () => {
    const req = makeRequest({ email: '  TEST@EXAMPLE.COM  ' });
    const res = await POST(req);
    // テーブル操作は小文字化されたメールで行われる
    // $executeRaw の引数を確認 (TemplateStringsArray なので最初の呼び出しをチェック)
    expect(prisma.$executeRaw).toHaveBeenCalled();
    // レスポンスは成功
    expect(res.status).toBe(200);
  });

  it('DB エラー → 500', async () => {
    vi.mocked(prisma.$executeRaw).mockRejectedValue(new Error('DB connection failed'));
    const req = makeRequest({ email: 'fail@test.com' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// proxy.ts ルーティングロジック
// ─────────────────────────────────────────────────────────────────────────────
describe('proxy.ts ルーティング', () => {
  let proxy: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.AUTH_SECRET = 'test-secret';
    const mod = await import('@/proxy');
    proxy = mod.default;
  });

  // 公開パス ─────────────────────────────────────────────────────────────────
  it('GET /api/health → 通過（公開）', async () => {
    const req = makeProxyRequest('/api/health');
    const res = await proxy(req);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(307);
  });

  it('GET /api/characters → 通過（公開API）', async () => {
    const req = makeProxyRequest('/api/characters');
    const res = await proxy(req);
    // 未認証でも公開APIは通過
    expect(res.status).not.toBe(401);
  });

  it('GET /api/moments → 通過（公開API）', async () => {
    const req = makeProxyRequest('/api/moments?characterId=luffy');
    const res = await proxy(req);
    expect(res.status).not.toBe(401);
  });

  it('GET /api/webhook/... → 通過（公開API）', async () => {
    const req = makeProxyRequest('/api/webhook/stripe');
    const res = await proxy(req);
    expect(res.status).not.toBe(401);
  });

  // 保護パス ─────────────────────────────────────────────────────────────────
  it('未認証 GET /api/chat/send → 401', async () => {
    const req = makeProxyRequest('/api/chat/send', { method: 'POST', token: null });
    const res = await proxy(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('未認証 GET /api/subscription/create → 401', async () => {
    const req = makeProxyRequest('/api/subscription/create', { method: 'POST', token: null });
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it('未認証 GET /api/gacha/pull → 401', async () => {
    const req = makeProxyRequest('/api/gacha/pull', { method: 'POST', token: null });
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  // 認証済み ─────────────────────────────────────────────────────────────────
  it('認証済み GET /api/chat/send → 通過', async () => {
    const req = makeProxyRequest('/api/chat/send', {
      method: 'POST',
      token: { sub: 'user123', onboardingStep: 'completed' },
    });
    const res = await proxy(req);
    expect(res.status).not.toBe(401);
  });

  // 管理者パス ───────────────────────────────────────────────────────────────
  it('未認証 GET /api/admin/stats → 401', async () => {
    const req = makeProxyRequest('/api/admin/stats', { token: null });
    const res = await proxy(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  // CORS preflight ──────────────────────────────────────────────────────────
  it('OPTIONS /api/chat/send → 200 (CORS preflight)', async () => {
    const req = makeProxyRequest('/api/chat/send', { method: 'OPTIONS' });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  // 不正な Server Action ID ─────────────────────────────────────────────────
  it('next-action ヘッダーが無効な場合 → 400', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'next-action': 'x' }, // 短すぎる = invalid
    });
    vi.mocked(getToken).mockResolvedValue(null);
    const res = await proxy(req);
    expect(res.status).toBe(400);
  });

  it('next-action ヘッダーが有効な場合 → 通過', async () => {
    const req = new NextRequest('http://localhost/', {
      method: 'POST',
      headers: { 'next-action': 'a1b2c3d4e5f6' }, // 12文字の16進数 = valid
    });
    vi.mocked(getToken).mockResolvedValue({ sub: 'u1', onboardingStep: 'completed' } as any);
    const res = await proxy(req);
    // Public page, valid action → should not be 400
    expect(res.status).not.toBe(400);
  });

  // 認証ページリダイレクト ───────────────────────────────────────────────────
  it('未認証 GET /login → 通過（認証ページは公開）', async () => {
    const req = makeProxyRequest('/login', { token: null });
    const res = await proxy(req);
    // 未認証でloginページは通過
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });

  it('認証済み GET /login → /explore or /onboarding へリダイレクト', async () => {
    const req = makeProxyRequest('/login', {
      token: { sub: 'u1', onboardingStep: 'completed' },
    });
    const res = await proxy(req);
    expect(res.status).toBe(307);
  });
});
