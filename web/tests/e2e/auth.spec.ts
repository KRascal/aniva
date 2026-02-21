import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('/login にアクセスできる', async ({ page }) => {
    const response = await page.goto('/login');
    // 200 または リダイレクト後 200
    expect(response!.status()).toBeLessThan(400);
    // ページが表示されている
    expect(page.url()).toMatch(/localhost:3050/);
  });

  test('/signup にアクセスできる', async ({ page }) => {
    const response = await page.goto('/signup');
    expect(response!.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/localhost:3050/);
  });

  test('ログインフォームまたはログインUIが表示される', async ({ page }) => {
    await page.goto('/login');
    // ログインに関するテキストが表示される
    await expect(
      page.getByText(/ログイン|サインイン|sign in|login/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('未認証で /chat にアクセスするとログインページへリダイレクト', async ({ page }) => {
    await page.goto('/chat');
    // リダイレクト後のURLがloginを含む
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain('login');
  });
});
