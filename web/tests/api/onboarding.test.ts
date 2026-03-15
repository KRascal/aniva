/**
 * tests/api/onboarding.test.ts
 * オンボーディングAPI ユニットテスト
 * - GET /api/onboarding/state: 状態取得
 * - POST /api/onboarding/nickname: ニックネーム設定
 * - POST /api/onboarding/complete: 完了処理
 * - 未認証 → 401
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
    character: {
      findUnique: vi.fn(),
    },
    relationship: {
      upsert: vi.fn(),
    },
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
function makeRequest(url: string, body?: object, method = 'POST') {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeGetRequest(url: string) {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/state
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/onboarding/state', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/onboarding/state/route');
    GET = mod.GET;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('認証済み: ユーザー存在 → 200 でオンボーディング状態を返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      nickname: 'テストユーザー',
      onboardingStep: 'nickname',
      onboardingCharacterId: null,
      onboardingDeeplinkSlug: null,
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.phase).toBe('nickname');
    expect(body.data.nickname).toBe('テストユーザー');
  });

  it('ユーザーが見つからない場合 → welcomeフェーズを返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.phase).toBe('welcome');
  });

  it('キャラクター情報があればcharacterを返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      nickname: 'ルフィファン',
      onboardingStep: 'birthday',
      onboardingCharacterId: 'char1',
      onboardingDeeplinkSlug: 'luffy',
    } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'モンキー・D・ルフィ',
      slug: 'luffy',
      avatarUrl: 'https://example.com/luffy.png',
      franchise: 'ONE PIECE',
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.character).toBeTruthy();
    expect(body.data.character.name).toBe('モンキー・D・ルフィ');
    expect(body.data.deeplinkSlug).toBe('luffy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/nickname
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/onboarding/nickname', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/onboarding/nickname/route');
    POST = mod.POST;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest('/api/onboarding/nickname', { nickname: 'テスト' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('空文字のニックネーム → 422', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    const req = makeRequest('/api/onboarding/nickname', { nickname: '' });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('空白のみのニックネーム → 422', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    const req = makeRequest('/api/onboarding/nickname', { nickname: '   ' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('20文字超のニックネーム → 422', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    const longNick = 'あ'.repeat(21); // 21文字
    const req = makeRequest('/api/onboarding/nickname', { nickname: longNick });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('正常系: ニックネーム設定成功 → 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      onboardingDeeplinkSlug: null,
      onboardingCharacterId: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user1',
      nickname: 'テストくん',
      onboardingStep: 'birthday',
    } as any);

    const req = makeRequest('/api/onboarding/nickname', { nickname: 'テストくん' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.nickname).toBe('テストくん');
    expect(body.data.nextStep).toBe('birthday');
  });

  it('ディープリンク由来のユーザー → nextStepがapproval', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      onboardingDeeplinkSlug: 'luffy',
      onboardingCharacterId: 'char1',
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user1',
      nickname: 'テストくん',
      onboardingStep: 'approval',
    } as any);

    const req = makeRequest('/api/onboarding/nickname', { nickname: 'テストくん' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.nextStep).toBe('approval');
  });

  it('XSS文字含むニックネーム → 422', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    const req = makeRequest('/api/onboarding/nickname', { nickname: '<script>alert(1)</script>' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('nicknameが未指定 → 422', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    const req = makeRequest('/api/onboarding/nickname', {});
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/complete
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/onboarding/complete', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/onboarding/complete/route');
    POST = mod.POST;
  });

  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest('/api/onboarding/complete', {});
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('ユーザーが見つからない → 404', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    // JWTのIDでもemailでも見つからない
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = makeRequest('/api/onboarding/complete', {});
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_FOUND');
  });

  it('正常系: オンボーディング完了 → 200でredirectToを返す', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      nickname: 'テストくん',
      displayName: 'test@example.com',
      onboardingCharacterId: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user1',
      onboardingStep: 'completed',
      onboardingCompletedAt: new Date(),
      onboardingCharacterId: null,
    } as any);

    const req = makeRequest('/api/onboarding/complete', {});
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.redirectTo).toBe('/explore');
  });

  it('キャラクター指定あり → /chat/{characterId}へリダイレクト', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      nickname: 'テストくん',
      displayName: 'test@example.com',
      onboardingCharacterId: 'char1',
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user1',
      onboardingStep: 'completed',
      onboardingCompletedAt: new Date(),
      onboardingCharacterId: 'char1',
    } as any);
    vi.mocked(prisma.relationship.upsert).mockResolvedValue({} as any);

    const req = makeRequest('/api/onboarding/complete', {});
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.redirectTo).toContain('/chat/char1');
    expect(body.data.redirectTo).toContain('from=onboarding');
  });

  it('通知許可フラグを渡せる', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1', email: 'test@example.com' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      nickname: null,
      displayName: 'user',
      onboardingCharacterId: null,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user1',
      onboardingStep: 'completed',
      notificationPermission: true,
      onboardingCharacterId: null,
    } as any);

    const req = makeRequest('/api/onboarding/complete', { notificationPermission: true });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notificationPermission: true }),
      })
    );
  });
});
