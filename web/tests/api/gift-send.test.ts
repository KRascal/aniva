/**
 * tests/api/gift-send.test.ts
 * ギフト送信API ユニットテスト
 * - GET /api/gift/send  — ギフト一覧取得
 * - POST /api/gift/send — ギフト送信（コイン消費、XP付与、レベルアップ）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth Helpers モック ────────────────────────────────────────────────────────
vi.mock('@/lib/auth-helpers', () => ({
  getVerifiedUserId: vi.fn(),
}));

// ── Prisma モック ──────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    coinBalance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    coinTransaction: {
      create: vi.fn(),
    },
    relationship: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
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

import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/gift/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── GIFT_CATALOG（ルートと同じ定義） ─────────────────────────────────────────
const GIFT_CATALOG = [
  { id: 'flower', name: '花束', emoji: '💐', coinCost: 10, xpReward: 5 },
  { id: 'cake', name: 'ケーキ', emoji: '🎂', coinCost: 30, xpReward: 15 },
  { id: 'ring', name: '指輪', emoji: '💍', coinCost: 100, xpReward: 50 },
  { id: 'star', name: '流れ星', emoji: '🌠', coinCost: 50, xpReward: 25 },
  { id: 'heart', name: 'ハート', emoji: '❤️', coinCost: 20, xpReward: 10 },
  { id: 'crown', name: '王冠', emoji: '👑', coinCost: 200, xpReward: 100 },
  { id: 'meat', name: '肉', emoji: '🍖', coinCost: 15, xpReward: 8 },
  { id: 'sake', name: 'お酒', emoji: '🍶', coinCost: 25, xpReward: 12 },
  { id: 'treasure', name: '宝箱', emoji: '💎', coinCost: 500, xpReward: 250 },
];

function setupDefaultMocks(userId = 'user1') {
  vi.mocked(getVerifiedUserId).mockResolvedValue(userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/gift/send', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/gift/send/route');
    GET = mod.GET;
  });

  it('ギフト一覧を返す（GIFT_CATALOGの全アイテム）', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gifts).toHaveLength(GIFT_CATALOG.length);
    // 各アイテムのフィールドを確認
    expect(body.gifts[0]).toHaveProperty('id');
    expect(body.gifts[0]).toHaveProperty('name');
    expect(body.gifts[0]).toHaveProperty('emoji');
    expect(body.gifts[0]).toHaveProperty('coinCost');
    expect(body.gifts[0]).toHaveProperty('xpReward');
  });

  it('GIFT_CATALOGのIDが正しく含まれる', async () => {
    const res = await GET();
    const body = await res.json();
    const ids = body.gifts.map((g: { id: string }) => g.id);
    for (const gift of GIFT_CATALOG) {
      expect(ids).toContain(gift.id);
    }
  });
});

describe('POST /api/gift/send', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/gift/send/route');
    POST = mod.POST;
  });

  // ── 認証 ──────────────────────────────────────────────────────────────────
  it('未認証 → 401', async () => {
    vi.mocked(getVerifiedUserId).mockResolvedValue(null);

    const req = makePostRequest({ characterId: 'char1', giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/i);
  });

  // ── バリデーション ─────────────────────────────────────────────────────
  it('characterId 欠落 → 400', async () => {
    setupDefaultMocks();
    const req = makePostRequest({ giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing/i);
  });

  it('giftType 欠落 → 400', async () => {
    setupDefaultMocks();
    const req = makePostRequest({ characterId: 'char1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing/i);
  });

  it('不正な giftType → 400', async () => {
    setupDefaultMocks();
    const req = makePostRequest({ characterId: 'char1', giftType: 'invalid_gift_xyz' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid gift type/i);
  });

  // ── コイン不足 ─────────────────────────────────────────────────────────
  it('コイン不足 → 402', async () => {
    setupDefaultMocks();
    // flower = 10コスト、残高 5コイン
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      freeBalance: 3,
      paidBalance: 2,
      balance: 5,
    } as any);

    const req = makePostRequest({ characterId: 'char1', giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toMatch(/コイン/);
    expect(body.success).toBe(false);
  });

  // ── freeBalance 優先消費 ───────────────────────────────────────────────
  it('freeBalance 優先消費の確認', async () => {
    setupDefaultMocks();
    // flower = 10コスト。freeBalance=7, paidBalance=10 → free 7 + paid 3 消費
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      freeBalance: 7,
      paidBalance: 10,
      balance: 17,
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) => {
      // ops[0] = coinBalance.update
      return [{ userId: 'user1', freeBalance: 0, paidBalance: 7, balance: 7 }];
    });

    vi.mocked(prisma.relationship.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'テストキャラ',
      slug: 'test',
    } as any);

    const req = makePostRequest({ characterId: 'char1', giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // トランザクションが呼ばれ、freeBalance優先で残高が正しく計算される
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  // ── 正常送信 ───────────────────────────────────────────────────────────
  it('正常送信: コイン消費、XP付与、レスポンス確認', async () => {
    setupDefaultMocks();
    // flower = 10コスト、5xp
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      freeBalance: 100,
      paidBalance: 50,
      balance: 150,
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) => {
      return [{ userId: 'user1', freeBalance: 90, paidBalance: 50, balance: 140 }];
    });

    vi.mocked(prisma.relationship.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'テストキャラ',
      slug: 'test',
    } as any);

    const req = makePostRequest({ characterId: 'char1', giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.xpGained).toBe(5); // flower xpReward
    expect(body.giftEmoji).toBe('💐');
    expect(body.reaction).toBeTruthy();
    expect(body.newBalance).toBe(140);
  });

  // ── レベルアップ判定 ───────────────────────────────────────────────────
  it('レベルアップ判定: XP閾値を超えた場合にレベルアップ', async () => {
    setupDefaultMocks();
    // ring = 100コスト、50xp
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      freeBalance: 200,
      paidBalance: 0,
      balance: 200,
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) => {
      return [{ userId: 'user1', freeBalance: 100, paidBalance: 0, balance: 100 }];
    });

    // XP が 140 → ring の 50xp 付与後 190 → 閾値 150 を超えてレベル3 → 4相当
    // xpThresholds = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000]
    // 現在 level=2, xp=140+50=190 > 150 → level 3 になる
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
      id: 'rel1',
      userId: 'user1',
      characterId: 'char1',
      locale: 'ja',
      level: 2,
      experiencePoints: 190, // すでに付与済みの値（updateMany後の値）
    } as any);
    vi.mocked(prisma.relationship.update).mockResolvedValue({
      id: 'rel1',
      level: 3,
    } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'テストキャラ',
      slug: 'test',
    } as any);

    const req = makePostRequest({ characterId: 'char1', giftType: 'ring' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // レベルアップ処理が呼ばれたことを確認
    expect(prisma.relationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ level: expect.any(Number) }),
      })
    );
  });

  it('レベルアップなし: XPが閾値未満の場合はupdateしない', async () => {
    setupDefaultMocks();
    // flower = 10コスト、5xp
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      freeBalance: 50,
      paidBalance: 0,
      balance: 50,
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) => {
      return [{ userId: 'user1', freeBalance: 40, paidBalance: 0, balance: 40 }];
    });

    // level=1, xp=20: 5xp後も25 < 50（次のthreshold）→ レベルアップなし
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue({
      id: 'rel1',
      userId: 'user1',
      characterId: 'char1',
      locale: 'ja',
      level: 1,
      experiencePoints: 25,
    } as any);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'テストキャラ',
      slug: 'test',
    } as any);

    const req = makePostRequest({ characterId: 'char1', giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // relationship.update (レベルアップ用) は呼ばれない
    expect(prisma.relationship.update).not.toHaveBeenCalled();
  });

  // ── キャラ固有リアクション ─────────────────────────────────────────────
  it('luffy + meat の特別リアクション', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
      userId: 'user1',
      freeBalance: 100,
      paidBalance: 0,
      balance: 100,
    } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (ops: any) => {
      return [{ userId: 'user1', freeBalance: 85, paidBalance: 0, balance: 85 }];
    });
    vi.mocked(prisma.relationship.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({
      id: 'char1',
      name: 'ルフィ',
      slug: 'luffy',
    } as any);

    const req = makePostRequest({ characterId: 'char1', giftType: 'meat' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reaction).toContain('肉');
    expect(body.reaction).not.toBe('肉だー！！！最高！！！'); // 特別版は異なる
  });

  // ── DB エラー ──────────────────────────────────────────────────────────
  it('DBエラー → 500', async () => {
    setupDefaultMocks();
    vi.mocked(prisma.coinBalance.findUnique).mockRejectedValue(new Error('DB connection failed'));

    const req = makePostRequest({ characterId: 'char1', giftType: 'flower' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });
});
