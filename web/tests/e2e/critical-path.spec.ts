import { test, expect } from '@playwright/test';

/**
 * クリティカルパス E2E テスト
 * 認証不要のパブリックページを確認する
 */

test.describe('クリティカルパス — パブリックページ', () => {
  test('テスト1: トップページが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ANIVA/);
    // ログインリンクが存在する
    const loginLink = page.getByRole('link', { name: /ログイン|Login|log.?in/i });
    await expect(loginLink.first()).toBeVisible();
  });

  test('テスト2: /discover が表示される', async ({ page }) => {
    await page.goto('/discover');
    // "DISCOVER" テキストまたはキャラクター一覧が存在する
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    const hasDiscoverContent =
      bodyText!.toLowerCase().includes('discover') ||
      bodyText!.includes('キャラクター') ||
      bodyText!.includes('character');
    expect(hasDiscoverContent).toBe(true);
  });

  test('テスト3: /login が表示される', async ({ page }) => {
    await page.goto('/login');
    // ログインフォーム（input またはボタン）が存在する
    const hasForm =
      (await page.locator('input[type="email"], input[type="text"]').count()) > 0 ||
      (await page.getByRole('button', { name: /log.?in|sign.?in|ログイン|続ける|continue/i }).count()) > 0;
    expect(hasForm).toBe(true);
  });

  test('テスト4: /pricing が表示される', async ({ page }) => {
    await page.goto('/pricing');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    // コイン or プラン表示が存在する
    const hasPricingContent =
      bodyText!.includes('コイン') ||
      bodyText!.includes('coin') ||
      bodyText!.includes('プラン') ||
      bodyText!.includes('Plan') ||
      bodyText!.includes('Free') ||
      bodyText!.includes('¥');
    expect(hasPricingContent).toBe(true);
  });

  test('テスト5: /legal/tokushoho が表示される', async ({ page }) => {
    await page.goto('/legal/tokushoho');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText).toContain('特定商取引法');
  });
});

test.describe('パブリックページ追加テスト', () => {
  test('特商法ページが表示される', async ({ page }) => {
    await page.goto('/legal/tokushoho');
    await expect(page).toHaveURL(/tokushoho/);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!).toMatch(/特定商取引|返品|運営/);
  });

  test('プライバシーポリシーが表示される', async ({ page }) => {
    await page.goto('/privacy');
    const bodyText = await page.textContent('body');
    expect(bodyText!).toMatch(/プライバシー|privacy|個人情報/i);
  });

  test('利用規約が表示される', async ({ page }) => {
    await page.goto('/terms');
    const bodyText = await page.textContent('body');
    expect(bodyText!).toMatch(/利用規約|terms/i);
  });
});

test.describe('API ヘルスチェック', () => {
  test('GET /api/health が200を返す', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('status', 'ok');
  });

  test('GET /api/characters?limit=3 が200を返す', async ({ request }) => {
    const res = await request.get('/api/characters?limit=3');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.characters ?? json)).toBe(true);
  });

  test('GET /api/pricing が200を返す', async ({ request }) => {
    const res = await request.get('/api/pricing');
    expect(res.status()).toBe(200);
  });

  test('未認証で GET /api/user が401を返す', async ({ request }) => {
    const res = await request.get('/api/user');
    expect([401, 403, 302]).toContain(res.status());
  });
});

test.describe('レスポンシブ — モバイルビューポート', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

  test('モバイルでLPが正常表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ANIVA/);
    // スクロール可能か確認
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(500);
  });

  test('モバイルでログインページが正常表示される', async ({ page }) => {
    await page.goto('/login');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
