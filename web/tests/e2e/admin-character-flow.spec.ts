/**
 * tests/e2e/admin-character-flow.spec.ts
 * 管理画面キャラ登録 → サービス反映 統合テスト
 *
 * 実際のブラウザ操作ではなく、Next.js Route Handler を直接呼び出す API 統合テスト。
 * vi.mock でPrisma/auth をモックし、既存テストのパターンを踏襲する。
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── auth モック (requireAdmin 用) ──────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ── auth-helpers モック (getVerifiedUserId 用) ─────────────────────────────────
vi.mock('@/lib/auth-helpers', () => ({
  getVerifiedUserId: vi.fn(),
}));

// ── admin モック ───────────────────────────────────────────────────────────────
vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
  isAdminEmail: vi.fn().mockResolvedValue(true),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    character: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenant: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    contract: {
      create: vi.fn(),
    },
    gachaBanner: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    storyChapter: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    characterSubscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    relationship: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    userCard: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    userStoryProgress: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $queryRawUnsafe: vi.fn(),
  },
}));

// ── audit-log モック ───────────────────────────────────────────────────────────
vi.mock('@/lib/audit-log', () => ({
  adminAudit: vi.fn().mockResolvedValue(undefined),
  ADMIN_AUDIT_ACTIONS: {
    CHARACTER_CREATE: 'character_create',
    CHARACTER_UPDATE: 'character_update',
    CHARACTER_TOGGLE_ACTIVE: 'character_toggle_active',
    CHARACTER_DELETE: 'character_delete',
    GACHA_BANNER_CREATE: 'gacha_banner_create',
    STORY_CREATE: 'story_create',
  },
}));

// ── logger モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── cache モック ───────────────────────────────────────────────────────────────
vi.mock('@/lib/cache', () => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
}));

// ── fs モック (SOUL.md 自動生成) ────────────────────────────────────────────────
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
}));

// ── path モック ────────────────────────────────────────────────────────────────
vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}));

// ── gacha-system モック ────────────────────────────────────────────────────────
vi.mock('@/lib/gacha-system', () => ({
  getFreeGachaAvailable: vi.fn().mockResolvedValue(false),
}));

// ── resolve-character モック ───────────────────────────────────────────────────
vi.mock('@/lib/resolve-character', () => ({
  resolveCharacterId: vi.fn().mockResolvedValue('char-test-id'),
}));

import { requireAdmin } from '@/lib/admin';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// ── ヘルパー ───────────────────────────────────────────────────────────────────
function makeAdminReq(url: string, method: string, body?: object) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** テスト用のキャラクターデータ */
const testCharData = {
  name: 'モンキー・D・ルフィ',
  nameEn: 'Monkey D. Luffy',
  slug: 'luffy-test',
  franchise: 'ONE PIECE',
  franchiseEn: 'ONE PIECE',
  systemPrompt: 'あなたはワンピースのルフィです。',
  avatarUrl: 'https://example.com/luffy.png',
  isActive: true,
  fcMonthlyPriceJpy: 3480,
  fcIncludedCallMin: 30,
  callCoinPerMin: 200,
  fcOverageCallCoinPerMin: 100,
  freeMessageLimit: 10,
  freeCallMinutes: 5,
  fcMonthlyCoins: 500,
  chatCoinPerMessage: 10,
};

/** モックキャラクターレスポンス */
const mockCreatedChar = {
  id: 'char-uuid-001',
  slug: testCharData.slug,
  name: testCharData.name,
  nameEn: testCharData.nameEn,
  franchise: testCharData.franchise,
  avatarUrl: testCharData.avatarUrl,
  isActive: true,
  fcMonthlyPriceJpy: 3480,
  callCoinPerMin: 200,
  fcOverageCallCoinPerMin: 100,
  createdAt: new Date('2026-03-15T00:00:00Z'),
};

// ══════════════════════════════════════════════════════════════════════════════
describe('Admin Character Management E2E', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: admin 認証成功
    vi.mocked(requireAdmin).mockResolvedValue({ email: 'admin@aniva.jp', id: 'admin-001' });
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/characters — 新規キャラ作成', async () => {
    vi.mocked(prisma.character.create).mockResolvedValue(mockCreatedChar as any);

    const { POST } = await import('@/app/api/admin/characters/route');
    const req = makeAdminReq('/api/admin/characters', 'POST', testCharData);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();

    // レスポンスに id, slug, name が含まれること
    expect(body.id).toBe('char-uuid-001');
    expect(body.slug).toBe('luffy-test');
    expect(body.name).toBe('モンキー・D・ルフィ');

    // Prismaが正しいデータで呼ばれたこと
    expect(prisma.character.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'モンキー・D・ルフィ',
          slug: 'luffy-test',
          franchise: 'ONE PIECE',
        }),
      })
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/characters — 未認証は403', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const { POST } = await import('@/app/api/admin/characters/route');
    const req = makeAdminReq('/api/admin/characters', 'POST', testCharData);
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/characters — 必須フィールド不足は400', async () => {
    const { POST } = await import('@/app/api/admin/characters/route');
    const req = makeAdminReq('/api/admin/characters', 'POST', {
      name: 'テストキャラ',
      // slug, franchise, systemPrompt が欠けている
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('GET /api/characters/id/{id} — 作成したキャラが取得できる', async () => {
    // $queryRawUnsafe でキャラを返すモック
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
      {
        id: 'char-uuid-001',
        name: 'モンキー・D・ルフィ',
        nameEn: 'Monkey D. Luffy',
        slug: 'luffy-test',
        franchise: 'ONE PIECE',
        franchiseEn: 'ONE PIECE',
        description: null,
        avatarUrl: 'https://example.com/luffy.png',
        coverUrl: null,
        catchphrases: [],
        personalityTraits: [],
        fcMonthlyPriceJpy: 3480,
        fcMonthlyCoins: 500,
        fcIncludedCallMin: 30,
        fcOverageCallCoinPerMin: 100,
        voiceModelId: null,
      },
    ] as any);

    const { GET } = await import('@/app/api/characters/id/[id]/route');
    const req = makeAdminReq('/api/characters/id/char-uuid-001', 'GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'char-uuid-001' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    // name, avatarUrl, slug が正しいこと
    expect(body.character.name).toBe('モンキー・D・ルフィ');
    expect(body.character.avatarUrl).toBe('https://example.com/luffy.png');
    expect(body.character.slug).toBe('luffy-test');
    // voiceModelId は公開されない
    expect(body.character.voiceModelId).toBeUndefined();
    // hasVoice フラグが含まれること
    expect(body.character.hasVoice).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('GET /api/characters/id/{id} — 存在しないIDは404', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([] as any);

    const { GET } = await import('@/app/api/characters/id/[id]/route');
    const req = makeAdminReq('/api/characters/id/not-exist', 'GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'not-exist' }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Character not found');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/characters/bulk-import — 一括インポート', async () => {
    // 重複スラッグなし
    vi.mocked(prisma.character.findFirst).mockResolvedValue(null);
    // キャラ作成成功
    vi.mocked(prisma.character.create)
      .mockResolvedValueOnce({ id: 'char-luffy', name: 'ルフィ', slug: 'luffy-bulk' } as any)
      .mockResolvedValueOnce({ id: 'char-zoro', name: 'ゾロ', slug: 'zoro-bulk' } as any)
      .mockResolvedValueOnce({ id: 'char-nami', name: 'ナミ', slug: 'nami-bulk' } as any);

    const { POST } = await import('@/app/api/admin/characters/bulk-import/route');
    const req = makeAdminReq('/api/admin/characters/bulk-import', 'POST', {
      franchise: 'ONE PIECE',
      franchiseEn: 'ONE PIECE',
      characters: [
        { name: 'ルフィ', nameEn: 'Luffy', slug: 'luffy-bulk', personality: '自由奔放' },
        { name: 'ゾロ', nameEn: 'Zoro', slug: 'zoro-bulk', personality: '剣士' },
        { name: 'ナミ', nameEn: 'Nami', slug: 'nami-bulk', personality: '航海士' },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // 全件成功
    expect(body.imported).toBe(3);
    expect(body.characters).toHaveLength(3);
    expect(body.errors).toHaveLength(0);

    // 各キャラクターに id, name, slug が含まれること
    expect(body.characters[0]).toMatchObject({ id: 'char-luffy', name: 'ルフィ', slug: 'luffy-bulk' });
    expect(body.characters[1]).toMatchObject({ id: 'char-zoro', name: 'ゾロ', slug: 'zoro-bulk' });
    expect(body.characters[2]).toMatchObject({ id: 'char-nami', name: 'ナミ', slug: 'nami-bulk' });
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/characters/bulk-import — 重複スラッグはエラーとしてスキップ', async () => {
    // 最初の2件は重複、最後の1件は新規
    vi.mocked(prisma.character.findFirst)
      .mockResolvedValueOnce({ id: 'existing-1', name: '既存ルフィ' } as any) // 重複
      .mockResolvedValueOnce({ id: 'existing-2', name: '既存ゾロ' } as any)   // 重複
      .mockResolvedValueOnce(null);                                            // 新規
    vi.mocked(prisma.character.create)
      .mockResolvedValueOnce({ id: 'char-nami', name: 'ナミ', slug: 'nami-unique' } as any);

    const { POST } = await import('@/app/api/admin/characters/bulk-import/route');
    const req = makeAdminReq('/api/admin/characters/bulk-import', 'POST', {
      franchise: 'ONE PIECE',
      characters: [
        { name: 'ルフィ', slug: 'luffy-bulk', personality: '自由' },
        { name: 'ゾロ', slug: 'zoro-bulk', personality: '剣士' },
        { name: 'ナミ', slug: 'nami-unique', personality: '航海士' },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(1);
    expect(body.errors).toHaveLength(2);
    expect(body.errors[0]).toContain('already exists');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/onboarding/ip — IPオンボーディングワンクリック', async () => {
    // テナント: 新規作成
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tenant.create).mockResolvedValue({
      id: 'tenant-shueisha',
      name: '集英社',
      slug: 'shueisha-1710000000000',
    } as any);

    // 契約作成
    vi.mocked(prisma.contract.create).mockResolvedValue({
      id: 'contract-op-001',
      tenantId: 'tenant-shueisha',
      targetWork: 'ONE PIECE',
    } as any);

    // キャラ重複なし
    vi.mocked(prisma.character.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.character.create)
      .mockResolvedValueOnce({ id: 'char-luffy-ip', name: 'ルフィ', slug: 'luffy-ip' } as any)
      .mockResolvedValueOnce({ id: 'char-zoro-ip', name: 'ゾロ', slug: 'zoro-ip' } as any);

    const { POST } = await import('@/app/api/admin/onboarding/ip/route');
    const req = makeAdminReq('/api/admin/onboarding/ip', 'POST', {
      companyName: '集英社',
      contactEmail: 'ip@shueisha.co.jp',
      ipName: 'ONE PIECE',
      revenueShareIp: 70,
      revenueShareAniva: 30,
      contractStart: '2026-04-01',
      contractEnd: '2027-03-31',
      characters: [
        { name: 'ルフィ', nameEn: 'Luffy', slug: 'luffy-ip', personality: '自由奔放' },
        { name: 'ゾロ', nameEn: 'Zoro', slug: 'zoro-ip', personality: '剣士' },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // テナント・キャラ・契約が一括作成されること
    // レスポンス: { tenant, contract, characters: { imported, list, errors }, bootstrapTriggered }
    expect(body.tenant).toMatchObject({ id: 'tenant-shueisha', name: '集英社' });
    expect(body.contract).toMatchObject({ id: 'contract-op-001' });
    expect(body.characters.imported).toBe(2);
    expect(body.characters.list).toHaveLength(2);
    expect(body.characters.errors).toHaveLength(0);

    // Prisma モックが呼ばれたこと
    expect(prisma.tenant.create).toHaveBeenCalledTimes(1);
    expect(prisma.contract.create).toHaveBeenCalledTimes(1);
    expect(prisma.character.create).toHaveBeenCalledTimes(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('POST /api/admin/onboarding/ip — 既存テナントは再利用される', async () => {
    // テナント: 既存
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
      id: 'tenant-existing',
      name: '集英社',
      slug: 'shueisha',
    } as any);
    vi.mocked(prisma.contract.create).mockResolvedValue({
      id: 'contract-op-002',
      tenantId: 'tenant-existing',
    } as any);
    vi.mocked(prisma.character.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.character.create).mockResolvedValue({
      id: 'char-nami-ip', name: 'ナミ', slug: 'nami-ip',
    } as any);

    const { POST } = await import('@/app/api/admin/onboarding/ip/route');
    const req = makeAdminReq('/api/admin/onboarding/ip', 'POST', {
      companyName: '集英社',
      ipName: 'ONE PIECE 2期',
      contractStart: '2026-10-01',
      characters: [
        { name: 'ナミ', slug: 'nami-ip', personality: '航海士' },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    // テナントは新規作成されていない
    expect(prisma.tenant.create).not.toHaveBeenCalled();
    expect(body.tenant.id).toBe('tenant-existing');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('ガチャバナー作成 → ガチャAPI反映', async () => {
    const mockBanner = {
      id: 'banner-op-001',
      name: 'ONE PIECE ガチャ 2026 Summer',
      description: '夏の大航海！レアキャラ大量排出',
      characterId: 'char-luffy-ip',
      startAt: new Date('2026-07-01T00:00:00Z'),
      endAt: new Date('2026-08-31T23:59:59Z'),
      costCoins: 100,
      isActive: true,
    };

    // バナー作成
    vi.mocked(prisma.gachaBanner.create).mockResolvedValue(mockBanner as any);

    const { POST: adminPost } = await import('@/app/api/admin/gacha/banners/route');
    const createReq = makeAdminReq('/api/admin/gacha/banners', 'POST', {
      name: 'ONE PIECE ガチャ 2026 Summer',
      description: '夏の大航海！レアキャラ大量排出',
      characterId: 'char-luffy-ip',
      startAt: '2026-07-01T00:00:00Z',
      endAt: '2026-08-31T23:59:59Z',
      costCoins: 100,
    });
    const createRes = await adminPost(createReq);

    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    expect(createdBody.id).toBe('banner-op-001');
    expect(createdBody.name).toBe('ONE PIECE ガチャ 2026 Summer');

    // 公開APIでバナーが取得できること (GET /api/gacha/banners)
    // 公開バナーAPIはアクティブ&期間内のもののみ返す
    vi.mocked(getVerifiedUserId).mockResolvedValue('user-guest');
    vi.mocked(prisma.gachaBanner.findMany).mockResolvedValue([mockBanner] as any);
    vi.mocked(prisma.gachaBanner.count).mockResolvedValue(0); // userCard.count

    const { GET: publicGet } = await import('@/app/api/gacha/banners/route');
    const getReq = makeAdminReq('/api/gacha/banners', 'GET');
    const getRes = await publicGet();

    expect(getRes.status).toBe(200);
    const getBanners = await getRes.json();
    expect(getBanners.banners).toHaveLength(1);
    expect(getBanners.banners[0].id).toBe('banner-op-001');
    expect(getBanners.banners[0].name).toBe('ONE PIECE ガチャ 2026 Summer');
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('ストーリーチャプター作成 → ストーリーAPI反映', async () => {
    const mockChapter = {
      id: 'chapter-001',
      characterId: 'char-luffy-ip',
      chapterNumber: 1,
      locale: 'ja',
      title: '海賊王の夢',
      synopsis: 'ルフィの夢の原点。',
      unlockLevel: 1,
      isFcOnly: false,
      triggerPrompt: '海賊王の夢について話してください。',
      isActive: true,
      backgroundUrl: null,
      coinReward: 5,
      character: { id: 'char-luffy-ip', name: 'ルフィ' },
    };

    // チャプター作成 (admin)
    vi.mocked(prisma.storyChapter.create).mockResolvedValue(mockChapter as any);

    const { POST: adminPost } = await import('@/app/api/admin/stories/route');
    const createReq = makeAdminReq('/api/admin/stories', 'POST', {
      characterId: 'char-luffy-ip',
      chapterNumber: 1,
      locale: 'ja',
      title: '海賊王の夢',
      synopsis: 'ルフィの夢の原点。',
      unlockLevel: 1,
      isFcOnly: false,
      triggerPrompt: '海賊王の夢について話してください。',
      isActive: true,
      coinReward: 5,
    });
    const createRes = await adminPost(createReq);

    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    // admin stories POST は { chapter } でラップして返す
    const chapter = createdBody.chapter ?? createdBody;
    expect(chapter.id).toBe('chapter-001');
    expect(chapter.title).toBe('海賊王の夢');
    expect(chapter.characterId).toBe('char-luffy-ip');

    // ストーリーAPIで取得できること (GET /api/story/{characterId})
    // auth セッション (userId) が必要なためモック
    const { auth: authMock } = await import('@/lib/auth');
    vi.mocked(authMock).mockResolvedValue({
      user: { id: 'user-fan-001', email: 'fan@example.com' },
    } as any);

    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char-luffy-ip',
      slug: 'luffy-ip',
      name: 'ルフィ',
    } as any);
    vi.mocked(prisma.storyChapter.count).mockResolvedValue(1); // シードスキップ
    vi.mocked(prisma.storyChapter.findMany).mockResolvedValue([{
      ...mockChapter,
      unlockCard: null,
      unlockCardId: null,
      choices: [],
    }] as any);

    const { GET: storyGet } = await import('@/app/api/story/[characterId]/route');
    const getReq = makeAdminReq('/api/story/char-luffy-ip', 'GET');
    const getRes = await storyGet(getReq, { params: Promise.resolve({ characterId: 'char-luffy-ip' }) });

    expect(getRes.status).toBe(200);
    const storyBody = await getRes.json();

    // チャプターが返ること
    expect(storyBody.chapters).toBeDefined();
    expect(storyBody.chapters).toHaveLength(1);
    const found = storyBody.chapters[0];
    expect(found.id).toBe('chapter-001');
    expect(found.title).toBe('海賊王の夢');
  });

});
