/**
 * tests/api/chat.test.ts
 * チャットAPI ユニットテスト
 * - POST /api/chat/send 正常系/異常系
 * - レート制限
 * - 未認証拒否
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth モック ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── Rate Limit モック ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  chatLimiter: {
    check: vi.fn(),
  },
  rateLimitResponse: vi.fn((result: { resetAt: number }) =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    character: {
      findUnique: vi.fn(),
    },
    relationship: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      count: vi.fn(),
    },
    coinBalance: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Character Engine モック ────────────────────────────────────────────────────
vi.mock('@/lib/character-engine', () => ({
  characterEngine: {
    generateResponse: vi.fn(),
  },
}));

// ── Freemium モック ────────────────────────────────────────────────────────────
vi.mock('@/lib/freemium', () => ({
  checkChatAccess: vi.fn(),
  incrementMonthlyChat: vi.fn(),
}));

// ── Streak モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/streak-system', () => ({
  updateStreak: vi.fn().mockResolvedValue({ streakDays: 1, isNew: false, milestone: null }),
}));

// ── Cliffhanger モック ─────────────────────────────────────────────────────────
vi.mock('@/lib/cliffhanger-system', () => ({
  setCliffhanger: vi.fn().mockResolvedValue(null),
}));

// ── Resolve Character モック ───────────────────────────────────────────────────
vi.mock('@/lib/resolve-character', () => ({
  resolveCharacterId: vi.fn().mockImplementation((id: string) => Promise.resolve(id)),
}));

// ── Semantic Memory モック ─────────────────────────────────────────────────────
vi.mock('@/lib/semantic-memory', () => ({
  extractAndStoreMemories: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from '@/lib/auth';
import { chatLimiter } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { checkChatAccess } from '@/lib/freemium';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/chat/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 正常動作のデフォルトモックをセットアップ */
function setupDefaultMocks() {
  vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
  vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });

  vi.mocked(prisma.character.findUnique).mockResolvedValue({
    id: 'char1',
    slug: 'luffy',
    freeMessageLimit: 10,
    fcMonthlyPriceJpy: 3480,
    chatCoinPerMessage: 10,
  } as any);

  vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
    id: 'rel1',
    userId: 'user1',
    characterId: 'char1',
    level: 1,
    experiencePoints: 0,
  } as any);

  vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: 'conv1' } as any);
  vi.mocked(prisma.conversation.update).mockResolvedValue({ id: 'conv1' } as any);

  const userMsg = { id: 'msg1', role: 'USER', content: 'Hello', conversationId: 'conv1' };
  const charMsg = { id: 'msg2', role: 'CHARACTER', content: 'Hi there!', conversationId: 'conv1' };
  vi.mocked(prisma.message.create)
    .mockResolvedValueOnce(userMsg as any)
    .mockResolvedValueOnce(charMsg as any);
  vi.mocked(prisma.message.count).mockResolvedValue(2);

  vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
    userId: 'user1', balance: 100, freeBalance: 50, paidBalance: 50,
  } as any);

  vi.mocked(characterEngine.generateResponse).mockResolvedValue({
    text: 'Hi there!',
    emotion: 'happy',
    shouldGenerateImage: false,
    shouldGenerateVoice: false,
  } as any);

  vi.mocked(checkChatAccess).mockResolvedValue({ type: 'FREE', freeMessagesRemaining: 8 } as any);
}

// ─────────────────────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/chat/send', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/chat/send/route');
    POST = mod.POST;
  });

  // 未認証 ──────────────────────────────────────────────────────────────────
  it('未認証 → 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = makeRequest({ characterId: 'char1', message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  // レート制限 ───────────────────────────────────────────────────────────────
  it('レート制限超過 → 429', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 30000 });
    const req = makeRequest({ characterId: 'char1', message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // バリデーション ───────────────────────────────────────────────────────────
  it('characterId 未指定 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });
    const req = makeRequest({ message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/i);
  });

  it('message 未指定 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });
    const req = makeRequest({ characterId: 'char1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('message が 2000文字超 → 400', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', slug: 'luffy', freeMessageLimit: 10, fcMonthlyPriceJpy: 3480, chatCoinPerMessage: 10,
    } as any);
    const longMessage = 'a'.repeat(2001);
    const req = makeRequest({ characterId: 'char1', message: longMessage });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too long/i);
  });

  it('キャラクターが存在しない → 404', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.character.findUnique).mockResolvedValue(null);
    const req = makeRequest({ characterId: 'nonexistent', message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/Character not found/i);
  });

  // 正常系 ──────────────────────────────────────────────────────────────────
  it('正常系 (FREE): 200 でメッセージを返す', async () => {
    setupDefaultMocks();
    // relationship が存在しない → 新規作成
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.relationship.create).mockResolvedValue({
      id: 'rel1', userId: 'user1', characterId: 'char1', level: 1, experiencePoints: 0,
    } as any);

    const req = makeRequest({ characterId: 'char1', message: 'Hello', locale: 'ja' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userMessage).toBeTruthy();
    expect(body.characterMessage).toBeTruthy();
    expect(body.consumed).toBe('FREE');
    expect(body.relationship).toBeTruthy();
  });

  it('正常系 (FC_UNLIMITED): consumed が FC_UNLIMITED', async () => {
    setupDefaultMocks();
    vi.mocked(checkChatAccess).mockResolvedValue({ type: 'FC_UNLIMITED' } as any);

    const req = makeRequest({ characterId: 'char1', message: 'Hello', locale: 'ja' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consumed).toBe('FC_UNLIMITED');
  });

  // フリーミアム制限 ─────────────────────────────────────────────────────────
  it('フリーミアムBLOCKED → 402', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', slug: 'luffy', freeMessageLimit: 10, fcMonthlyPriceJpy: 3480, chatCoinPerMessage: 10,
    } as any);
    vi.mocked(checkChatAccess).mockResolvedValue({ type: 'BLOCKED' } as any);

    const req = makeRequest({ characterId: 'char1', message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('FREE_LIMIT_REACHED');
  });

  // コイン不足 ──────────────────────────────────────────────────────────────
  it('COIN_REQUIRED でコイン不足 → 402', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(chatLimiter.check).mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60000 });
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1', slug: 'luffy', freeMessageLimit: 10, fcMonthlyPriceJpy: 3480, chatCoinPerMessage: 10,
    } as any);
    vi.mocked(checkChatAccess).mockResolvedValue({ type: 'COIN_REQUIRED', coinCost: 10 } as any);

    // $transaction でコイン不足エラーをスロー
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      throw new Error('INSUFFICIENT_COINS');
    });

    const req = makeRequest({ characterId: 'char1', message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('FREE_LIMIT_REACHED');
  });

  // レスポンス構造 ───────────────────────────────────────────────────────────
  it('レスポンスに relationship フィールドが含まれる', async () => {
    setupDefaultMocks();
    const req = makeRequest({ characterId: 'char1', message: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.relationship).toHaveProperty('level');
    expect(body.relationship).toHaveProperty('xp');
    expect(body.relationship).toHaveProperty('totalMsgCount');
  });

  it('characterEngine.generateResponse が呼ばれる', async () => {
    setupDefaultMocks();
    const req = makeRequest({ characterId: 'char1', message: 'Test message', locale: 'en' });
    await POST(req);
    expect(characterEngine.generateResponse).toHaveBeenCalledWith(
      'char1',
      'rel1',
      'Test message',
      'en',
      expect.any(Object)
    );
  });
});
