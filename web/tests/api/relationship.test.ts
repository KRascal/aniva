/**
 * tests/api/relationship.test.ts
 * リレーションシップAPI ユニットテスト
 * - GET /api/relationship/following    — フォロー中キャラ一覧
 * - GET /api/relationship/[characterId] — 特定キャラとの関係性
 * - POST /api/relationship/[characterId]/follow — フォロー/アンフォロー
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
    relationship: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    message: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ── resolve-character モック ────────────────────────────────────────────────────
vi.mock('@/lib/resolve-character', () => ({
  resolveCharacterId: vi.fn((id: string) => Promise.resolve(id)),
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
function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(url: string, body: object = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue(
    userId ? ({ user: { id: userId } } as any) : null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/relationship/following
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/relationship/following', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/relationship/following/route');
    GET = mod.GET;
  });

  it('未認証 → 401', async () => {
    setupAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('フォロー中キャラ一覧を返す（認証済み）', async () => {
    setupAuth('user1');
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      {
        characterId: 'char1',
        isFanclub: false,
        character: {
          id: 'char1',
          name: 'ルフィ',
          nameEn: 'Luffy',
          slug: 'luffy',
          franchise: 'ONE PIECE',
          avatarUrl: 'https://example.com/luffy.png',
          coverUrl: null,
        },
      },
      {
        characterId: 'char2',
        isFanclub: true,
        character: {
          id: 'char2',
          name: 'ゾロ',
          nameEn: 'Zoro',
          slug: 'zoro',
          franchise: 'ONE PIECE',
          avatarUrl: null,
          coverUrl: null,
        },
      },
    ] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.following).toHaveLength(2);
    expect(body.following[0].id).toBe('char1');
    expect(body.following[0].name).toBe('ルフィ');
    expect(body.following[0].isFanclub).toBe(false);
    expect(body.following[1].id).toBe('char2');
    expect(body.following[1].isFanclub).toBe(true);
  });

  it('フォロー中キャラが存在しない場合は空配列', async () => {
    setupAuth('user1');
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.following).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/relationship/[characterId]
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/relationship/[characterId]', () => {
  let GET: (req: NextRequest, ctx: { params: Promise<{ characterId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/relationship/[characterId]/route');
    GET = mod.GET;
  });

  it('未認証 → 401', async () => {
    setupAuth(null);
    const req = makeGetRequest('http://localhost/api/relationship/char1');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it('リレーションシップが存在しない場合はデフォルト値を返す', async () => {
    setupAuth('user1');
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/relationship/char1');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.level).toBe(1);
    expect(body.xp).toBe(0);
    expect(body.totalMessages).toBe(0);
  });

  it('特定キャラとの関係性を返す（認証済み）', async () => {
    setupAuth('user1');
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
      id: 'rel1',
      userId: 'user1',
      characterId: 'char1',
      locale: 'ja',
      level: 3,
      experiencePoints: 250,
      totalMessages: 42,
      firstMessageAt: new Date('2025-01-01'),
      lastMessageAt: new Date('2025-03-01'),
      isFanclub: false,
      isFollowing: true,
      streakDays: 5,
      streakLastDate: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10時間前（アクティブ）
      memorySummary: {
        preferences: { likes: ['ラーメン', '剣術'], dislikes: [] },
        importantFacts: ['海賊王になりたい'],
        recentTopics: [],
      },
      character: {
        id: 'char1',
        name: 'ルフィ',
        nameEn: 'Luffy',
        slug: 'luffy',
        franchise: 'ONE PIECE',
        franchiseEn: 'ONE PIECE',
        description: '海賊王を目指す少年',
        avatarUrl: 'https://example.com/luffy.png',
        coverUrl: null,
        catchphrases: ['海賊王に、おれはなる！'],
        personalityTraits: ['自由', '友情'],
        voiceModelId: null,
      },
    } as any);

    const req = makeGetRequest('http://localhost/api/relationship/char1');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.level).toBe(3);
    expect(body.xp).toBe(250);
    expect(body.totalMessages).toBe(42);
    expect(body.isFollowing).toBe(true);
    expect(body.isFanclub).toBe(false);
    expect(body.sharedTopics).toHaveLength(3); // 2 likes + 1 fact
    expect(body.streakDays).toBe(5);
    expect(body.isStreakActive).toBe(true);
  });

  it('ストリーク: 48時間以上前の場合はisStreakActive=false', async () => {
    setupAuth('user1');
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
      id: 'rel1',
      userId: 'user1',
      characterId: 'char1',
      locale: 'ja',
      level: 2,
      experiencePoints: 100,
      totalMessages: 10,
      firstMessageAt: null,
      lastMessageAt: null,
      isFanclub: false,
      isFollowing: true,
      streakDays: 3,
      streakLastDate: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50時間前（非アクティブ）
      memorySummary: {},
      character: {
        id: 'char1',
        name: 'テスト',
        nameEn: null,
        slug: 'test',
        franchise: 'TEST',
        franchiseEn: null,
        description: null,
        avatarUrl: null,
        coverUrl: null,
        catchphrases: [],
        personalityTraits: [],
        voiceModelId: null,
      },
    } as any);

    const req = makeGetRequest('http://localhost/api/relationship/char1');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(body.isStreakActive).toBe(false);
    expect(body.streakDays).toBe(0); // 非アクティブなので0
    expect(body.previousStreakDays).toBe(3); // 元の値
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/relationship/[characterId]/follow
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/relationship/[characterId]/follow', () => {
  let POST: (req: NextRequest, ctx: { params: Promise<{ characterId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/relationship/[characterId]/follow/route');
    POST = mod.POST;
  });

  it('未認証 → 401', async () => {
    setupAuth(null);
    const req = makePostRequest('http://localhost/api/relationship/char1/follow');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it('フォロー: 未フォロー状態 → フォロー済みになる', async () => {
    setupAuth('user1');
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'ルフィ',
      slug: 'luffy',
      catchphrases: ['海賊王に、おれはなる！'],
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    vi.mocked(prisma.relationship.findUnique)
      .mockResolvedValueOnce(null) // フォロー状態確認: 未フォロー
      .mockResolvedValue({ id: 'rel1' } as any); // ウェルカムメッセージ送信時
    vi.mocked(prisma.relationship.upsert).mockResolvedValue({
      id: 'rel1',
      userId: 'user1',
      characterId: 'char1',
      isFollowing: true,
    } as any);
    vi.mocked(prisma.relationship.count).mockResolvedValue(100);
    // ウェルカムメッセージ送信のモック
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: 'conv1' } as any);
    vi.mocked(prisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);

    const req = makePostRequest('http://localhost/api/relationship/char1/follow');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isFollowing).toBe(true);
    expect(body.characterId).toBe('char1');
    expect(body.followerCount).toBe(100);
  });

  it('アンフォロー: フォロー済み状態 → アンフォローになる', async () => {
    setupAuth('user1');
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'ゾロ',
      slug: 'zoro',
      catchphrases: [],
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1' } as any);
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
      id: 'rel1',
      isFollowing: true,
    } as any);
    vi.mocked(prisma.relationship.upsert).mockResolvedValue({
      id: 'rel1',
      userId: 'user1',
      characterId: 'char1',
      isFollowing: false, // アンフォロー後
    } as any);
    vi.mocked(prisma.relationship.count).mockResolvedValue(99);

    const req = makePostRequest('http://localhost/api/relationship/char1/follow');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isFollowing).toBe(false);
    expect(body.followerCount).toBe(99);
  });

  it('キャラクターが存在しない → 404', async () => {
    setupAuth('user1');
    vi.mocked(prisma.character.findUnique).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/relationship/nonexistent/follow');
    const ctx = { params: Promise.resolve({ characterId: 'nonexistent' }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/Character not found/i);
  });

  it('ユーザーが存在しない → 404', async () => {
    setupAuth('user1');
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'ルフィ',
      slug: 'luffy',
      catchphrases: [],
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/relationship/char1/follow');
    const ctx = { params: Promise.resolve({ characterId: 'char1' }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/User not found/i);
  });
});
