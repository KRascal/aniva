import { test, expect } from '@playwright/test';

// Note: This app uses Next-Auth middleware which redirects unauthenticated
// requests to /login (307) rather than returning 401.

test('root URL returns 200', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBeLessThan(400);
});

test('login page is accessible', async ({ request }) => {
  const res = await request.get('/login');
  expect(res.status()).toBeLessThan(400);
});

test('api/chat/send requires auth (redirects to login)', async ({ request }) => {
  const res = await request.post('/api/chat/send', {
    data: { characterId: 'luffy', message: 'test' },
    maxRedirects: 0,
  });
  // Next-Auth middleware: 307 redirect to /login (or 401 if custom error handling)
  expect([307, 302, 303, 401, 403]).toContain(res.status());
});

test('api/chat/history requires auth (redirects to login)', async ({ request }) => {
  const res = await request.get('/api/chat/history?characterId=luffy', {
    maxRedirects: 0,
  });
  expect([307, 302, 303, 401, 403]).toContain(res.status());
});

test('api/relationship requires auth (redirects to login)', async ({ request }) => {
  const res = await request.get('/api/relationship?characterId=luffy', {
    maxRedirects: 0,
  });
  expect([307, 302, 303, 401, 403]).toContain(res.status());
});

test('api/moments returns data or requires auth', async ({ request }) => {
  const res = await request.get('/api/moments?characterId=luffy', {
    maxRedirects: 0,
  });
  // moments may be public (200) or require auth (307/401)
  expect([200, 307, 302, 303, 401, 403]).toContain(res.status());
});

test('signup page is accessible', async ({ request }) => {
  const res = await request.get('/signup');
  expect(res.status()).toBeLessThan(400);
});

test('unauthenticated /chat redirects to login', async ({ request }) => {
  const res = await request.get('/chat', { maxRedirects: 0 });
  expect([307, 302, 303, 308]).toContain(res.status());
  const location = res.headers()['location'] ?? '';
  expect(location).toContain('login');
});
