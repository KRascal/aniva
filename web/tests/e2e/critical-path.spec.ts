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
