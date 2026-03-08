/**
 * ANIVA Middleware — 認証ガード + セキュリティヘッダー + CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 認証不要のパス
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/landing',
  '/terms',
  '/privacy',
  '/legal',
  '/offline',
  '/onboarding',
  '/c/', // キャラクタープロフィール（公開）
  '/explore',
  '/discover',
];

// 認証不要のAPIパス
const PUBLIC_API_PATHS = [
  '/api/auth',        // NextAuth
  '/api/health',      // ヘルスチェック
  '/api/cron/',       // Cronジョブ（CRON_SECRETで認証）
  '/api/webhook/',    // Stripe webhook
  '/api/og',          // OGP画像
  '/api/geoip',       // GeoIP
  '/api/characters',  // キャラ一覧（公開）
  '/api/moments',     // Moments一覧（公開）
  '/api/onboarding/', // オンボーディング
  '/api/push/subscribe', // Push通知登録
];

// 静的ファイル
const STATIC_EXTENSIONS = ['.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.mp3', '.mp4', '.woff', '.woff2', '.css', '.js', '.map', '.json', '.xml', '.txt'];

function isPublicPath(pathname: string): boolean {
  // 静的ファイル
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) return true;
  // Next.js internal
  if (pathname.startsWith('/_next/')) return true;
  // 公開ページ
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;
  // ただしexact match "/"のみ（/mypageなどは除外）
  if (pathname === '/') return true;
  // 公開API
  if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) return true;
  // robots, sitemap
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') return true;

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // ─── セキュリティヘッダー ───
  // CSP
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://us.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https: http:",
    "connect-src 'self' https://api.stripe.com https://api.x.ai https://api.elevenlabs.io https://us.i.posthog.com https://accounts.google.com wss:",
    "frame-src https://js.stripe.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  // ─── CORS（API routes のみ） ───
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    const allowedOrigins = [
      'https://aniva-project.com',
      'https://demo.aniva-project.com',
      'http://localhost:3050',
      'http://localhost:3061',
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: res.headers });
    }
  }

  // ─── 認証チェック ───
  if (!isPublicPath(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    });

    if (!token) {
      // API → 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // ページ → ログインにリダイレクト
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // 静的ファイルとNext.js internalを除外
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|audio/).*)',
  ],
};
