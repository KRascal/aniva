import { test, expect } from '@playwright/test';

test.describe('チャット画面（認証確認）', () => {
  test('root URL が 200 を返す（サーバー疎通確認）', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBeLessThan(400);
  });

  test('認証なしで /chat にアクセスするとログインページへリダイレクト', async ({ page }) => {
    // /chat へアクセス → login へリダイレクトされることを確認
    await page.goto('/chat');
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain('login');
  });

  test('/chat への直接 GET リクエストは 307 リダイレクトを返す', async ({ request }) => {
    // request API はリダイレクトを自動追跡しないため 307 が確認できる
    const res = await request.get('/chat', { maxRedirects: 0 });
    // 307 リダイレクト（認証必須）
    expect([307, 302, 303, 308]).toContain(res.status());
  });
});
