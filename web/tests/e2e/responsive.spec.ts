import { test, expect } from '@playwright/test';

/**
 * E2E テスト: レスポンシブデザイン
 * モバイル・デスクトップ両方での表示確認
 */

test.describe('レスポンシブ: デスクトップ', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('デスクトップ: ランディングページが正常に表示される', async ({ page }) => {
    await page.goto('/');
    // ページが表示される
    await expect(page.locator('body')).toBeVisible();
    // ビューポートが正しい
    const viewport = page.viewportSize();
    expect(viewport!.width).toBe(1280);
  });

  test('デスクトップ: /login ページが正常に表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('デスクトップ: /pricing ページが正常に表示される', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(10);
  });
});

test.describe('レスポンシブ: モバイル', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

  test('モバイル: ランディングページが正常に表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const viewport = page.viewportSize();
    expect(viewport!.width).toBe(390);
  });

  test('モバイル: /login ページが正常に表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('モバイル: /pricing ページが正常に表示される', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('モバイル: ランディングからログインリンクにアクセスできる', async ({ page }) => {
    await page.goto('/');
    // ログインリンクが存在する（モバイルでも表示される）
    const loginLink = page.getByRole('link', { name: /ログイン|login/i }).first();
    await expect(loginLink).toBeVisible({ timeout: 10000 });
  });
});
