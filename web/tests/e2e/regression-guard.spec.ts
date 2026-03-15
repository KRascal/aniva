import { test, expect } from '@playwright/test';

/**
 * 退化防止テスト（Regression Guard）
 * 
 * 過去に壊れた機能を二度と壊さないためのテスト集。
 * 新しいバグが報告されたら、ここにテストを追加する。
 * 
 * ルール: このファイルのテストは絶対に削除しない。追加のみ。
 */

test.describe('退化防止 — ページ表示', () => {
  // 2026-03-15: /discover の InvariantError でマイページ・タイムラインが全滅した
  const CRITICAL_PAGES = [
    { path: '/', name: 'ランディングページ' },
    { path: '/login', name: 'ログインページ' },
    { path: '/discover', name: 'ディスカバーページ' },
    { path: '/moments', name: 'タイムライン' },
    { path: '/pricing', name: '料金ページ' },
    { path: '/privacy', name: 'プライバシーポリシー' },
    { path: '/terms', name: '利用規約' },
  ];

  for (const page of CRITICAL_PAGES) {
    test(`${page.name} (${page.path}) が500を返さない`, async ({ request }) => {
      const res = await request.get(page.path);
      expect(res.status()).not.toBe(500);
      expect(res.status()).not.toBe(502);
      expect(res.status()).not.toBe(503);
    });
  }

  // 認証が必要なページは307リダイレクトを返す（500ではない）
  const AUTH_PAGES = [
    '/explore', '/mypage', '/chat', '/cards', '/settings',
    '/chat/group', '/explore/gacha', '/ranking', '/story',
    '/events', '/diary', '/letters', '/notifications',
    '/memory-cards', '/admin',
  ];

  for (const path of AUTH_PAGES) {
    test(`${path} が500を返さない（307リダイレクト=正常）`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      // 307(auth redirect) or 200(public) は正常、500系はNG
      expect(res.status()).toBeLessThan(500);
    });
  }
});

test.describe('退化防止 — API応答', () => {
  // パブリックAPIが認証エラーにならないこと
  const PUBLIC_APIS = [
    { path: '/api/health', name: 'ヘルスチェック' },
    { path: '/api/characters', name: 'キャラクター一覧' },
    { path: '/api/moments?page=1&limit=1', name: 'モーメント一覧' },
    { path: '/api/stories', name: 'ストーリー一覧' },
    { path: '/api/geoip', name: 'GeoIP' },
    { path: '/api/pricing', name: '料金API' },
    { path: '/api/coins/packages', name: 'コインパッケージ' },
  ];

  for (const api of PUBLIC_APIS) {
    test(`${api.name} (${api.path}) が200を返す`, async ({ request }) => {
      const res = await request.get(api.path);
      expect(res.status()).toBe(200);
    });
  }

  // 認証APIが適切な401/403を返す（500ではない）
  const AUTH_APIS = [
    '/api/user',
    '/api/chat/list',
    '/api/coins/balance',
    '/api/notifications',
  ];

  for (const path of AUTH_APIS) {
    test(`${path} が認証エラーを返す（500ではない）`, async ({ request }) => {
      const res = await request.get(path);
      expect([401, 403]).toContain(res.status());
    });
  }
});

test.describe('退化防止 — LP表示内容', () => {
  test('LPにANIVAタイトルが含まれる', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ANIVA/);
  });

  test('LPにログインボタンがある', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink.first()).toBeVisible();
  });

  test('LPにCTAボタンがある', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('button, a').filter({ hasText: /始め|はじめ|会いに/ });
    await expect(cta.first()).toBeVisible();
  });
});

test.describe('退化防止 — ログインページ', () => {
  test('Googleログインボタンがある', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.locator('button, a').filter({ hasText: /Google/ });
    await expect(googleBtn.first()).toBeVisible();
  });

  test('LINEログインボタンがある', async ({ page }) => {
    await page.goto('/login');
    const lineBtn = page.locator('button, a').filter({ hasText: /LINE/ });
    await expect(lineBtn.first()).toBeVisible();
  });

  test('メールOTPフォームがある', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[placeholder*="メール"]');
    await expect(emailInput.first()).toBeVisible();
  });
});

test.describe('退化防止 — キャラクターAPI', () => {
  test('キャラクター一覧が配列で返る', async ({ request }) => {
    const res = await request.get('/api/characters');
    expect(res.status()).toBe(200);
    const json = await res.json();
    const chars = json.characters ?? json;
    expect(Array.isArray(chars)).toBe(true);
  });

  test('キャラクターにname/slug/idがある', async ({ request }) => {
    const res = await request.get('/api/characters?limit=1');
    const json = await res.json();
    const chars = json.characters ?? json;
    if (chars.length > 0) {
      expect(chars[0]).toHaveProperty('name');
      expect(chars[0]).toHaveProperty('slug');
      expect(chars[0]).toHaveProperty('id');
    }
  });
});

test.describe('退化防止 — DiscoverページUI', () => {
  test('/discover にキャラクター表示がある', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    // discoverページにはキャラクター関連コンテンツがあるはず
    const hasContent = bodyText && (
      bodyText.includes('キャラクター') ||
      bodyText.includes('フォロー') ||
      bodyText.includes('スワイプ') ||
      bodyText.includes('出会')
    );
    expect(hasContent).toBeTruthy();
  });
});

test.describe('退化防止 — レスポンシブ', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('モバイルでLPが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ANIVA/);
  });

  test('モバイルでログインが表示される', async ({ page }) => {
    await page.goto('/login');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
