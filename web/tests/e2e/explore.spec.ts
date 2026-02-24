import { test, expect } from '@playwright/test';

/**
 * E2E テスト: /explore ページ
 * キャラクター探索ページの表示を確認する
 */

test.describe('/explore ページ', () => {
  test('/explore にアクセスできる（認証またはリダイレクト）', async ({ page }) => {
    const response = await page.goto('/explore');
    // 200 またはリダイレクト後 200
    expect(response!.status()).toBeLessThan(400);
  });

  test('/explore → ログイン済みまたはリダイレクト先でコンテンツが表示される', async ({ page }) => {
    await page.goto('/explore');
    // URLが有効
    expect(page.url()).toMatch(/localhost:3050/);
    // 何かしらのコンテンツが表示される（タイトル、またはキャラクター/ログイン画面）
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('/explore → ランディングにいる場合はキャラクターへのリンクが存在する（公開キャラ）', async ({ page }) => {
    await page.goto('/');
    // ランディングページでキャラクターへのリンクが存在する
    const characterLinks = page.locator('a[href*="/profile/"]');
    const count = await characterLinks.count();
    // 少なくとも1つのキャラクターリンクがある
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('/explore へのリクエストが正常に処理される', async ({ request }) => {
    const res = await request.get('/explore', { maxRedirects: 0 });
    // 200 またはリダイレクト（認証必要な場合）
    expect([200, 307, 302, 303, 308]).toContain(res.status());
  });
});
