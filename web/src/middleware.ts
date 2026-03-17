/**
 * Next.js Middleware — 全APIに対するグローバルレート制限
 * 
 * Edge Runtimeで動作するため、Redisは使わずメモリ内Sliding Windowで実装。
 * 個別APIのRedis limiterとは別レイヤー（IP-based global defense）。
 * 
 * 制限:
 *   - /api/* 全体: 120 req/min per IP
 *   - /api/auth/*: 10 req/min per IP
 *   - /api/cron/*: cron-secret必須（rate limit対象外）
 *   - /api/admin/*: 30 req/min per IP
 *   - 書き込み系(POST/PUT/DELETE): 60 req/min per IP
 */

import { NextRequest, NextResponse } from 'next/server';

// ── In-memory sliding window (Edge Runtime compatible) ──
// Map<ip:bucket, { count, windowStart }>
const windows = new Map<string, { count: number; windowStart: number }>();

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // 1分

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - 120_000; // 2分前より古いものを削除
  for (const [key, val] of windows) {
    if (val.windowStart < cutoff) windows.delete(key);
  }
}

function checkLimit(ip: string, bucket: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  cleanup();
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // 新しいウィンドウ
    windows.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: limit - entry.count };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API以外はスルー
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Cron APIはsecret検証のみ（各route内で実装済み）
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  // Webhook APIは外部から大量に来うるのでそのまま
  if (pathname.startsWith('/api/webhook/')) {
    return NextResponse.next();
  }

  // 画像配信APIは高頻度アクセス前提なので除外
  if (pathname.startsWith('/api/uploads/')) {
    return NextResponse.next();
  }

  // ヘルスチェックは除外
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const method = req.method;

  // Auth API: 厳しめ 10 req/min
  if (pathname.startsWith('/api/auth/')) {
    const { allowed, remaining } = checkLimit(ip, 'auth', 10, 60_000);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Remaining', remaining.toString());
    return res;
  }

  // Admin API: 30 req/min
  if (pathname.startsWith('/api/admin/')) {
    const { allowed, remaining } = checkLimit(ip, 'admin', 30, 60_000);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Remaining', remaining.toString());
    return res;
  }

  // 書き込み系 (POST/PUT/DELETE): 60 req/min
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const { allowed, remaining } = checkLimit(ip, 'write', 60, 60_000);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Remaining', remaining.toString());
    return res;
  }

  // GET系の汎用: 120 req/min
  const { allowed, remaining } = checkLimit(ip, 'global', 120, 60_000);
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }
  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Remaining', remaining.toString());
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
