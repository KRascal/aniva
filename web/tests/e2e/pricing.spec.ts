import { test, expect } from '@playwright/test';

/**
 * E2E テスト: /pricing ページ
 * 料金プランページの表示を確認する
 */

test.describe('/pricing ページ', () => {
  test('/pricing にアクセスできる', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response!.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/localhost:3050/);
  });

  test('/pricing → 料金に関するテキストが存在する', async ({ page }) => {
    await page.goto('/pricing');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    // 料金ページには価格情報が含まれるはず
    const hasPricingContent = bodyText!.includes('¥') ||
      bodyText!.includes('プラン') ||
      bodyText!.includes('Free') ||
      bodyText!.includes('Standard') ||
      bodyText!.includes('Premium');
    expect(hasPricingContent).toBe(true);
  });

  test('/pricing → Free プランが表示される', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Free').first()).toBeVisible({ timeout: 10000 });
  });

  test('/pricing → Standard または有料プランが存在する', async ({ page }) => {
    await page.goto('/pricing');
    // Standard または Premium プランがある
    const standardOrPremium = await page.getByText(/Standard|Premium|¥980|¥1980/i).count();
    expect(standardOrPremium).toBeGreaterThanOrEqual(1);
  });

  test('GET /pricing → HTTP 200 を返す', async ({ request }) => {
    const res = await request.get('/pricing');
    expect(res.status()).toBe(200);
  });
});
