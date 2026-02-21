import { test, expect } from '@playwright/test';

test.describe('ランディングページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('タイトル "ANIVA" が存在する', async ({ page }) => {
    await expect(page).toHaveTitle(/ANIVA/);
    // ヘッダーにも ANIVA テキストが存在する
    await expect(page.getByText('ANIVA').first()).toBeVisible();
  });

  test('ルフィのキャラクターカードが表示される', async ({ page }) => {
    // モンキー・D・ルフィのカードが表示される
    await expect(page.getByText('モンキー・D・ルフィ')).toBeVisible();
    // ワンピースのテキストが表示される
    await expect(page.getByText('ワンピース')).toBeVisible();
    // ルフィのセリフが表示される
    await expect(page.getByText(/海賊王/)).toBeVisible();
  });

  test('CTA ボタンが存在する（サインアップ・ログイン）', async ({ page }) => {
    // ログインリンクが存在する
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
    // 無料で始めるリンクが存在する
    await expect(page.getByRole('link', { name: /無料/ }).first()).toBeVisible();
  });

  test('OGP meta タグ (og:title, og:description) が存在する', async ({ page }) => {
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');

    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toContain('ANIVA');
    expect(ogDescription).toBeTruthy();
    expect(ogDescription!.length).toBeGreaterThan(0);
  });
});
