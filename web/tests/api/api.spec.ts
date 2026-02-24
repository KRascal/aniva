import { test, expect } from '@playwright/test';

/**
 * API Tests - ANIVA
 * Tests various API endpoints for correct behavior
 */

test.describe('API: /api/health', () => {
  test('GET /api/health → 200 と status:ok を返す', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });
});

test.describe('API: /api/characters', () => {
  test('GET /api/characters → 200 でキャラクター一覧を返す', async ({ request }) => {
    const res = await request.get('/api/characters');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('characters');
    expect(Array.isArray(body.characters)).toBe(true);
  });

  test('GET /api/characters → 各キャラクターが必須フィールドを持つ', async ({ request }) => {
    const res = await request.get('/api/characters');
    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.characters.length > 0) {
      const char = body.characters[0];
      expect(char).toHaveProperty('id');
      expect(char).toHaveProperty('name');
      expect(char).toHaveProperty('slug');
    }
  });

  test('GET /api/characters → Content-Type は application/json', async ({ request }) => {
    const res = await request.get('/api/characters');
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
  });
});

test.describe('API: /api/chat/send 認証チェック', () => {
  test('POST /api/chat/send → 認証なしで 307/401/403 を返す', async ({ request }) => {
    const res = await request.post('/api/chat/send', {
      data: { characterId: 'luffy', message: 'こんにちは' },
      maxRedirects: 0,
    });
    expect([307, 302, 303, 401, 403]).toContain(res.status());
  });
});

test.describe('API: /api/moments', () => {
  test('GET /api/moments → 200 または 認証必須', async ({ request }) => {
    const res = await request.get('/api/moments?characterId=luffy', {
      maxRedirects: 0,
    });
    expect([200, 307, 302, 303, 401, 403]).toContain(res.status());
  });
});

test.describe('API: /api/push/subscribe バリデーション', () => {
  test('POST /api/push/subscribe → 認証なしで 401 を返す', async ({ request }) => {
    const res = await request.post('/api/push/subscribe', {
      data: {
        subscription: {
          endpoint: 'https://example.com/push/test-endpoint',
          keys: { p256dh: 'test-key', auth: 'test-auth' },
        },
      },
      maxRedirects: 0,
    });
    // 認証なしは 401 または リダイレクト
    expect([307, 302, 303, 401, 403]).toContain(res.status());
  });
});

test.describe('API: /api/relationship/:id 認証チェック', () => {
  test('GET /api/relationship/[characterId] → 認証なしで 307/401 を返す', async ({ request }) => {
    const res = await request.get('/api/relationship/luffy', {
      maxRedirects: 0,
    });
    expect([307, 302, 303, 401, 403]).toContain(res.status());
  });

  test('GET /api/relationship/all → 認証なしで 307/401 を返す', async ({ request }) => {
    const res = await request.get('/api/relationship/all', {
      maxRedirects: 0,
    });
    expect([307, 302, 303, 401, 403]).toContain(res.status());
  });
});
