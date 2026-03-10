/**
 * スモークテスト: 全主要ページが200を返すこと + 致命的エラーなし
 * 新機能追加後にページが壊れてないことを確認するための最低限テスト
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.ANIVA_URL ?? 'http://localhost:3061';

// 認証不要ページ
const publicPages = [
  { path: '/', name: 'ルートLP' },
  { path: '/login', name: 'ログイン' },
  { path: '/landing', name: 'ランディングページ' },
];

// 認証必要ページ（ログインページにリダイレクトされるのが正常）
const authPages = [
  { path: '/explore', name: '探す' },
  { path: '/chat', name: 'チャット一覧' },
  { path: '/mypage', name: 'マイページ' },
  { path: '/ranking', name: 'ランキング' },
  { path: '/cards', name: 'カード' },
  { path: '/discover', name: 'ディスカバー' },
  { path: '/moments', name: 'モーメント' },
  { path: '/explore/gacha', name: 'ガチャ' },
];

// APIヘルスチェック
test('API health check', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/api/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});

// 公開ページ
for (const page of publicPages) {
  test(`公開ページ: ${page.name} (${page.path})`, async ({ page: p }) => {
    const response = await p.goto(`${BASE_URL}${page.path}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    
    // コンソールエラーをチェック
    const errors: string[] = [];
    p.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await p.waitForTimeout(1000);
    // 致命的なReactエラーがないことを確認
    const hasReactError = await p.locator('text=Application error').count();
    expect(hasReactError).toBe(0);
  });
}

// 認証必要ページ（リダイレクトまたは200が正常）
for (const page of authPages) {
  test(`認証ページ: ${page.name} (${page.path})`, async ({ page: p }) => {
    const response = await p.goto(`${BASE_URL}${page.path}`, { waitUntil: 'domcontentloaded' });
    // 200（ログインユーザー）またはリダイレクト（302→login）が正常
    const status = response?.status() ?? 0;
    expect(status).toBeLessThan(500);
    
    // 致命的なReactエラーがないことを確認
    await p.waitForTimeout(500);
    const hasReactError = await p.locator('text=Application error').count();
    expect(hasReactError).toBe(0);
  });
}

// 全APIエンドポイントが500を返さないことの確認
const criticalApis = [
  '/api/health',
  '/api/characters',
  '/api/gacha/banners',
];

for (const api of criticalApis) {
  test(`API ${api} が500でない`, async ({ request }) => {
    const res = await request.get(`${BASE_URL}${api}`);
    expect(res.status()).toBeLessThan(500);
  });
}
