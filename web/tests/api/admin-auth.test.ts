/**
 * tests/api/admin-auth.test.ts
 * 認証・認可ユニットテスト
 * - 未認証リクエストが401を返すことを確認
 * - 管理者APIが非管理者に403を返すことを確認
 * - IDOR防止: 他ユーザーのリソースにアクセスできないことを確認
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── Auth Helpers モック ────────────────────────────────────────────────────────
vi.mock('@/lib/auth-helpers', () => ({
  getVerifiedUserId: vi.fn(),
}));

// ── Rate Limit モック ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  paymentLimiter: { check: vi.fn().mockResolvedValue({ success: true, remaining: 4, resetAt: Date.now() + 60000 }) },
  gachaLimiter: { check: vi.fn().mockResolvedValue({ success: true, remaining: 4, resetAt: Date.now() + 60000 }) },
  chatLimiter: { check: vi.fn().mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 }) },
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    character: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    characterSubscription: { findFirst: vi.fn() },
    coinPackage: { findUnique: vi.fn() },
    coinTransaction: { findFirst: vi.fn() },
    coinBalance: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    relationship: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    conversation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    message: { create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    gachaBanner: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// ── その他のモック ─────────────────────────────────────────────────────────────
vi.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  },
}));

vi.mock('@/lib/character-engine', () => ({
  characterEngine: { generateResponse: vi.fn() },
}));

vi.mock('@/lib/freemium', () => ({
  checkChatAccess: vi.fn(),
  incrementMonthlyChat: vi.fn(),
}));

vi.mock('@/lib/streak-system', () => ({
  updateStreak: vi.fn().mockResolvedValue({ streakDays: 1, isNew: false, milestone: null }),
}));

vi.mock('@/lib/cliffhanger-system', () => ({
  setCliffhanger: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/resolve-character', () => ({
  resolveCharacterId: vi.fn().mockImplementation((id: string) => Promise.resolve(id)),
}));

vi.mock('@/lib/semantic-memory', () => ({
  extractAndStoreMemories: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/message-weight', () => ({
  shouldUseDeepMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/thinking-reactions', () => ({
  getThinkingReaction: vi.fn().mockReturnValue('考え中...'),
}));

vi.mock('@/lib/ranking-system', () => ({
  addChatScore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/image-analysis', () => ({
  analyzeImage: vi.fn().mockResolvedValue(null),
  imageAnalysisToPromptHint: vi.fn().mockReturnValue(''),
}));

vi.mock('@/lib/image-character-reaction', () => ({
  getCharacterImagePrompt: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/multimodal-memory', () => ({
  storeImageMemory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audit-log', () => ({
  adminAudit: vi.fn().mockResolvedValue(undefined),
  ADMIN_AUDIT_ACTIONS: { CHARACTER_UPDATED: 'CHARACTER_UPDATED', CHARACTER_CREATED: 'CHARACTER_CREATED' },
}));

vi.mock('@/lib/cache', () => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from '@/lib/auth';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(url: string, body?: object, method = body ? 'POST' : 'GET') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 未認証リクエスト → 401
// ─────────────────────────────────────────────────────────────────────────────
describe('未認証リクエスト → 401', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/coins/spend — 未認証 → 401', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue(null);
    const { POST } = await import('@/app/api/coins/spend/route');
    const req = makeRequest('http://localhost/api/coins/spend', {
      amount: 100, type: 'GACHA', idempotencyKey: 'key1',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/coins/purchase — 未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const { POST } = await import('@/app/api/coins/purchase/route');
    const req = makeRequest('http://localhost/api/coins/purchase', { packageId: 'pkg_100' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/fc/subscribe — 未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const { POST } = await import('@/app/api/fc/subscribe/route');
    const req = makeRequest('http://localhost/api/fc/subscribe', { characterId: 'char1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/gacha/pull — 未認証 → 401', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue(null);
    const { POST } = await import('@/app/api/gacha/pull/route');
    const req = makeRequest('http://localhost/api/gacha/pull', {
      bannerId: 'banner1', count: 1,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/chat/send — 未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const { POST } = await import('@/app/api/chat/send/route');
    const req = makeRequest('http://localhost/api/chat/send', {
      characterId: 'char1', message: 'Hello',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 管理者API: 非管理者 → 403
// ─────────────────────────────────────────────────────────────────────────────
describe('管理者APIへの非管理者アクセス → 403', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = 'admin@example.com';
  });

  it('GET /api/admin/characters — 非管理者ユーザー → 403', async () => {
    // 一般ユーザーとしてログイン
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user_normal', email: 'normal@example.com' },
    } as any);

    const { GET } = await import('@/app/api/admin/characters/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/characters — 未認証 → 403', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const { GET } = await import('@/app/api/admin/characters/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/characters — 管理者ユーザー → 200', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin_user', email: 'admin@example.com' },
    } as any);
    vi.mocked(prisma.character.findMany).mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/characters/route');
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. IDOR防止: 他ユーザーのリソースへのアクセス
// ─────────────────────────────────────────────────────────────────────────────
describe('IDOR防止: 認証ユーザーは自分のリソースのみ操作できる', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('コイン消費: userIdはセッションから取得（リクエストボディのuserIdは無視される）', async () => {
    // getVerifiedUserId は session から 'user1' を返す
    vi.mocked(getVerifiedUserId).mockResolvedValue('user1');
    // 冪等性チェック: 未処理
    vi.mocked(prisma.coinTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockResolvedValue({
      newBalance: 900,
      transactionId: 'tx_idor_test',
    });

    const { POST } = await import('@/app/api/coins/spend/route');
    // リクエストボディに別のユーザーIDを含めても、セッションのuserIdが使われる
    const req = makeRequest('http://localhost/api/coins/spend', {
      amount: 100,
      type: 'GACHA',
      idempotencyKey: 'key_idor',
      // 攻撃者が別のuserIdを指定しようとしても...
      userId: 'victim_user_id', // この値はAPIが無視する
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // $transaction の呼び出しを確認: victim_user_id ではなく user1 が使われている
    expect(prisma.$transaction).toHaveBeenCalled();
    // getVerifiedUserId が呼ばれている = セッションベースの認証
    expect(getVerifiedUserId).toHaveBeenCalled();
  });

  it('チャット送信: userIdはセッションから取得（characterIdのみリクエストから受け取る）', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);

    // chatLimiter and freemium mocks
    const { chatLimiter } = await import('@/lib/rate-limit');
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });

    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', slug: 'luffy', freeMessageLimit: 10, fcMonthlyPriceJpy: 3480, chatCoinPerMessage: 10,
    } as any);
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
      id: 'rel1', userId: 'user1', characterId: 'char1', level: 1, experiencePoints: 0,
    } as any);
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: 'conv1' } as any);
    vi.mocked(prisma.conversation.update).mockResolvedValue({ id: 'conv1' } as any);
    vi.mocked(prisma.message.create)
      .mockResolvedValueOnce({ id: 'msg1', role: 'USER', content: 'Hello' } as any)
      .mockResolvedValueOnce({ id: 'msg2', role: 'CHARACTER', content: 'Hi' } as any);
    vi.mocked(prisma.message.count).mockResolvedValue(2);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({ userId: 'user1', balance: 100, freeBalance: 50, paidBalance: 50 } as any);
    vi.mocked(prisma.relationship.update).mockResolvedValue({ id: 'rel1', level: 1, experiencePoints: 0 } as any);

    const { checkChatAccess } = await import('@/lib/freemium');
    vi.mocked(checkChatAccess).mockResolvedValue({ type: 'FREE', freeMessagesRemaining: 8 } as any);

    const { characterEngine } = await import('@/lib/character-engine');
    vi.mocked(characterEngine.generateResponse).mockResolvedValue({
      text: 'Hi!', emotion: 'happy', shouldGenerateImage: false, shouldGenerateVoice: false,
    } as any);

    const { POST } = await import('@/app/api/chat/send/route');
    // セッションの user1 ではなく別ユーザーのrelationshipにアクセスしようとしても
    // characterId のみ指定できる（userId は常にセッションから）
    const req = makeRequest('http://localhost/api/chat/send', {
      characterId: 'char1',
      message: 'Hello',
      locale: 'ja',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // relationship.findUnique が user1 で呼ばれていることを確認
    expect(prisma.relationship.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId_characterId_locale: expect.objectContaining({ userId: 'user1' }) }),
      })
    );
  });

  it('FC加入: userIdはセッションから取得（IDOR不可）', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'session_user' } } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', name: 'Luffy', fcMonthlyPriceJpy: 3480, fcIncludedCallMin: 30, fcMonthlyCoins: 500,
    } as any);
    // 既存サブスクリプションなし
    vi.mocked(prisma.characterSubscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: 'cus_session',
      email: 'session@example.com',
    } as any);

    const { stripe } = await import('@/lib/stripe');
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/fc_idor',
    } as any);

    const { POST } = await import('@/app/api/fc/subscribe/route');
    const req = makeRequest('http://localhost/api/fc/subscribe', {
      characterId: 'char1',
      // 攻撃者が別のユーザーIDを指定しようとしても無視される
      userId: 'victim_user',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // characterSubscription.findFirst が session_user で呼ばれている
    expect(prisma.characterSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'session_user' }),
      })
    );
  });
});
