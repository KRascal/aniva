/**
 * tests/api/moments.test.ts
 * モーメントAPI ユニットテスト
 * - GET /api/moments — モーメント一覧
 *   - following/recommend モード
 *   - characterId フィルター
 *   - cursor pagination
 *   - FC限定コンテンツのアクセス制御（PREMIUM visibility）
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
    },
    relationship: {
      findMany: vi.fn(),
    },
    characterSubscription: {
      findMany: vi.fn(),
    },
    moment: {
      findMany: vi.fn(),
      create: vi.fn(),
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
function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/moments');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function setupAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue(
    userId ? ({ user: { id: userId } } as any) : null
  );
}

function makeMoment(overrides: Partial<{
  id: string;
  characterId: string;
  type: string;
  content: string;
  mediaUrl: string | null;
  visibility: string;
  levelRequired: number;
  isFcOnly: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'moment1',
    characterId: overrides.characterId ?? 'char1',
    character: { id: 'char1', name: 'ルフィ', avatarUrl: null },
    type: overrides.type ?? 'TEXT',
    content: overrides.content ?? 'テストコンテンツ',
    mediaUrl: overrides.mediaUrl ?? null,
    visibility: overrides.visibility ?? 'PUBLIC',
    levelRequired: overrides.levelRequired ?? 0,
    isFcOnly: overrides.isFcOnly ?? false,
    publishedAt: overrides.publishedAt ?? new Date('2025-01-01'),
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    reactions: [],
    _count: { comments: 0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/moments
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/moments', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/moments/route');
    GET = mod.GET;
  });

  // ── 未認証でも表示できる（recommendモード） ────────────────────────────
  it('未認証でもrecommendモードでPUBLIC投稿を返す', async () => {
    setupAuth(null);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', visibility: 'PUBLIC' }),
      makeMoment({ id: 'moment2', visibility: 'PUBLIC' }),
    ] as any);

    const req = makeRequest({ mode: 'recommend' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.moments).toHaveLength(2);
    expect(body.moments[0].isLocked).toBe(false);
  });

  // ── followingモード ────────────────────────────────────────────────────
  it('followingモード: フォロー中キャラのモーメントを返す', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 2, isFollowing: true },
      { characterId: 'char2', level: 1, isFollowing: false },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', characterId: 'char1' }),
    ] as any);

    const req = makeRequest({ mode: 'following' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.moments).toHaveLength(1);
    expect(body.moments[0].characterId).toBe('char1');
  });

  it('followingモード: フォロー中キャラがいない場合はisFollowingNone=true', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 1, isFollowing: false },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([]);

    const req = makeRequest({ mode: 'following' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isFollowingNone).toBe(true);
  });

  // ── recommendモード: isFollowing フィールド ────────────────────────────
  it('recommendモード: isFollowingフィールドを含む', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 2, isFollowing: true },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', characterId: 'char1', visibility: 'PUBLIC' }),
    ] as any);

    const req = makeRequest({ mode: 'recommend' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isFollowing).toBe(true);
  });

  // ── characterId フィルター ─────────────────────────────────────────────
  it('characterId フィルター: 特定キャラのモーメントのみ返す', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', characterId: 'char2' }),
      makeMoment({ id: 'moment2', characterId: 'char2' }),
    ] as any);

    const req = makeRequest({ characterId: 'char2' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.moments).toHaveLength(2);
    expect(body.moments.every((m: { characterId: string }) => m.characterId === 'char2')).toBe(true);
  });

  it('characterId フィルター: 未認証でも取得可能', async () => {
    setupAuth(null);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', characterId: 'char1', visibility: 'PUBLIC' }),
    ] as any);

    const req = makeRequest({ characterId: 'char1' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.moments).toHaveLength(1);
  });

  // ── cursor pagination ──────────────────────────────────────────────────
  it('cursor pagination: nextCursor が返る', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 1, isFollowing: true },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);

    // limit=2 に対して 3件返す → 3件目が nextCursor になる
    const moments = [
      makeMoment({ id: 'moment1' }),
      makeMoment({ id: 'moment2' }),
      makeMoment({ id: 'moment3' }), // これが nextCursor
    ];
    vi.mocked(prisma.moment.findMany).mockResolvedValue(moments as any);

    const req = makeRequest({ limit: '2' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments).toHaveLength(2); // 2件のみ
    expect(body.nextCursor).toBe('moment3');
  });

  it('cursor pagination: 結果がlimit以下の場合はnextCursor=null', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 1, isFollowing: true },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1' }),
    ] as any);

    const req = makeRequest({ limit: '20' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.nextCursor).toBeNull();
  });

  it('cursor指定: skip=1でカーソル後から取得', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 1, isFollowing: true },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment5' }),
      makeMoment({ id: 'moment6' }),
    ] as any);

    const req = makeRequest({ cursor: 'moment4' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    // cursor指定時は prisma.moment.findMany に cursor と skip: 1 が渡されるはず
    expect(prisma.moment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'moment4' },
        skip: 1,
      })
    );
    expect(body.moments).toHaveLength(2);
  });

  // ── FC限定コンテンツのアクセス制御 ────────────────────────────────────
  it('PREMIUM visibility: FC未加入ユーザーはコンテンツがロック', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 3, isFollowing: true },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]); // FC未加入
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({
        id: 'moment1',
        characterId: 'char1',
        visibility: 'PREMIUM',
        content: 'FC限定コンテンツ！',
        mediaUrl: 'https://example.com/fc-content.jpg',
      }),
    ] as any);

    const req = makeRequest({ characterId: 'char1' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(true);
    expect(body.moments[0].content).toBeNull(); // コンテンツはロック
    expect(body.moments[0].mediaUrl).toBeNull(); // メディアもロック
  });

  it('PREMIUM visibility: FC加入ユーザーはコンテンツにアクセス可能', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([
      { characterId: 'char1', level: 3, isFollowing: true },
    ] as any);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([
      { characterId: 'char1' }, // FC加入済み
    ] as any);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({
        id: 'moment1',
        characterId: 'char1',
        visibility: 'PREMIUM',
        content: 'FC限定コンテンツ！',
        mediaUrl: 'https://example.com/fc-content.jpg',
      }),
    ] as any);

    const req = makeRequest({ characterId: 'char1' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(false);
    expect(body.moments[0].content).toBe('FC限定コンテンツ！');
    expect(body.moments[0].mediaUrl).toBe('https://example.com/fc-content.jpg');
  });

  it('isFcOnly=true: FC未加入ユーザーはロック + FC限定メッセージ表示', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]); // FC未加入
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({
        id: 'moment1',
        characterId: 'char1',
        visibility: 'PUBLIC',
        isFcOnly: true,
        content: '秘密のコンテンツ',
      }),
    ] as any);

    const req = makeRequest({ characterId: 'char1' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(true);
    expect(body.moments[0].content).toContain('FC限定');
  });

  it('isFcOnly=true: FC加入ユーザーはコンテンツにアクセス可能', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([
      { characterId: 'char1' }, // FC加入済み
    ] as any);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({
        id: 'moment1',
        characterId: 'char1',
        visibility: 'PUBLIC',
        isFcOnly: true,
        content: '秘密のコンテンツ',
      }),
    ] as any);

    const req = makeRequest({ characterId: 'char1' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(false);
    expect(body.moments[0].content).toBe('秘密のコンテンツ');
  });

  // ── PUBLIC visibility: 誰でもアクセス可能 ─────────────────────────────
  it('PUBLIC visibility: FREEプランのユーザーもアクセス可能', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', visibility: 'PUBLIC', content: '公開コンテンツ' }),
    ] as any);

    const req = makeRequest({ mode: 'recommend' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(false);
    expect(body.moments[0].content).toBe('公開コンテンツ');
  });

  // ── STANDARD visibility: STANDARDプラン以上 ───────────────────────────
  it('STANDARD visibility: FREEプランはロック', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', visibility: 'STANDARD', content: 'スタンダードコンテンツ' }),
    ] as any);

    const req = makeRequest({ mode: 'recommend' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(true);
    expect(body.moments[0].content).toBeNull();
  });

  it('STANDARD visibility: STANDARDプランはアクセス可能', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'STANDARD' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', visibility: 'STANDARD', content: 'スタンダードコンテンツ' }),
    ] as any);

    const req = makeRequest({ mode: 'recommend' });
    const res = await GET(req);
    const body = await res.json();
    expect(body.moments[0].isLocked).toBe(false);
    expect(body.moments[0].content).toBe('スタンダードコンテンツ');
  });

  // ── レスポンス構造 ─────────────────────────────────────────────────────
  it('レスポンスに必要なフィールドが含まれる', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user1', plan: 'FREE' } as any);
    vi.mocked(prisma.relationship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.characterSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.moment.findMany).mockResolvedValue([
      makeMoment({ id: 'moment1', visibility: 'PUBLIC' }),
    ] as any);

    const req = makeRequest({ mode: 'recommend' });
    const res = await GET(req);
    const body = await res.json();
    const moment = body.moments[0];
    expect(moment).toHaveProperty('id');
    expect(moment).toHaveProperty('characterId');
    expect(moment).toHaveProperty('character');
    expect(moment).toHaveProperty('type');
    expect(moment).toHaveProperty('visibility');
    expect(moment).toHaveProperty('reactionCount');
    expect(moment).toHaveProperty('userHasLiked');
    expect(moment).toHaveProperty('isLocked');
    expect(moment).toHaveProperty('commentCount');
    expect(moment).toHaveProperty('publishedAt');
  });

  // ── DB エラー ──────────────────────────────────────────────────────────
  it('DBエラー → 500', async () => {
    setupAuth('user1');
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB connection failed'));

    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });
});
