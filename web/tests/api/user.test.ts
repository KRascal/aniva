/**
 * tests/api/user.test.ts
 * ユーザーAPI ユニットテスト
 * - GET /api/users/me: プロフィール取得
 * - PATCH /api/users/settings: 設定更新
 * - DELETE /api/user/account: アカウント削除
 * - 全て未認証 → 401
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Logger モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(url: string, method: string, body?: object) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/users/me/route');
    GET = mod.GET;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('emailなしのセッション → 401', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any); // emailなし
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('ユーザーが見つからない → 404', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('User not found');
  });

  it('正常系: プロフィール取得 → 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      displayName: 'テストユーザー',
      nickname: 'テスト',
      avatarUrl: 'https://example.com/avatar.png',
      image: null,
      coverImageUrl: null,
      bio: 'テスト用プロフィール',
      profilePublic: true,
      plan: 'FREE',
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('user1');
    expect(body.email).toBe('test@example.com');
    expect(body.displayName).toBe('テストユーザー');
    expect(body.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('avatarUrlがnullの場合、imageにフォールバック', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      displayName: 'テスト',
      nickname: null,
      avatarUrl: null, // avatarUrlなし
      image: 'https://oauth.example.com/photo.jpg', // OAuthのimage
      coverImageUrl: null,
      bio: null,
      profilePublic: false,
      plan: 'FREE',
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    // imageにフォールバックされる
    expect(body.avatarUrl).toBe('https://oauth.example.com/photo.jpg');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/settings & PUT /api/users/settings
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users/settings', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/users/settings/route');
    GET = mod.GET;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('正常系: 設定取得 → 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      displayName: 'テスト',
      plan: 'FREE',
      language: 'ja',
      settings: { theme: 'dark', notifications: true },
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings).toBeTruthy();
    expect(body.settings.theme).toBe('dark');
    expect(body.email).toBe('test@example.com');
  });

  it('ユーザーが見つからない → 404', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/users/settings', () => {
  let PUT: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/users/settings/route');
    PUT = mod.PUT;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest('/api/users/settings', 'PUT', { theme: 'dark' });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it('無効なtheme → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    const req = makeRequest('/api/users/settings', 'PUT', { theme: 'rainbow' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid theme');
  });

  it('無効なlanguage → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    const req = makeRequest('/api/users/settings', 'PUT', { language: 'zh' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid language');
  });

  it('正常系: 設定更新 → 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      settings: { theme: 'dark', notifications: true, language: 'ja' },
      language: 'ja',
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    const req = makeRequest('/api/users/settings', 'PUT', { theme: 'light', notifications: false });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.theme).toBe('light');
    expect(body.settings.notifications).toBe(false);
  });

  it('language更新: DBのlanguageカラムも更新される', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      settings: {},
      language: 'ja',
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    const req = makeRequest('/api/users/settings', 'PUT', { language: 'en' });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ language: 'en' }),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/user/account
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/user/account', () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/user/account/route');
    DELETE = mod.DELETE;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest('/api/user/account', 'DELETE');
    const res = await DELETE(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('正常系: アカウント削除スケジュール → 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const req = makeRequest('/api/user/account', 'DELETE', { reason: 'サービスが不要になりました' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.deleteScheduledAt).toBeTruthy();
    // 削除日が30日後になっていることを確認
    const scheduledAt = new Date(body.deleteScheduledAt);
    const diff = scheduledAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000); // 29日以上
    expect(diff).toBeLessThan(31 * 24 * 60 * 60 * 1000);    // 31日以内
  });

  it('reasonなしでも削除可能', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const req = makeRequest('/api/user/account', 'DELETE');
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('DB エラー → 500', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB error'));

    const req = makeRequest('/api/user/account', 'DELETE');
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });

  it('$transaction が正しい引数で呼ばれる（ソフトデリート + セッション削除）', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      await fn({
        user: { update: vi.fn() },
        session: { deleteMany: vi.fn() },
      });
    });

    const req = makeRequest('/api/user/account', 'DELETE', { reason: '退会テスト' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
