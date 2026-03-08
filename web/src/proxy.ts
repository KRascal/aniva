import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const SUPPORTED_LOCALES = ['ja', 'en'];
const DEFAULT_LOCALE = 'ja';

function detectLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;
  const acceptLang = req.headers.get('accept-language') ?? '';
  for (const locale of SUPPORTED_LOCALES) {
    if (acceptLang.includes(locale)) return locale;
  }
  return DEFAULT_LOCALE;
}

// ─── セキュリティヘッダー付きレスポンス生成 ───
function withSecurityHeaders(res: NextResponse, req: NextRequest): NextResponse {
  // CSP
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://us.i.posthog.com https://us-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https: http:",
    "connect-src 'self' https://api.stripe.com https://api.x.ai https://api.elevenlabs.io https://us.i.posthog.com https://us-assets.i.posthog.com https://accounts.google.com wss:",
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

  // CORS（API routes のみ）
  if (req.nextUrl.pathname.startsWith('/api/')) {
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
  }

  return res;
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const res = new NextResponse(null, { status: 200 });
    return withSecurityHeaders(res, req);
  }

  // ── Server Action 不正リクエスト防御 ──
  // ボット/スキャナーが "x" 等の無効なAction IDを送信 → 500エラー抑止
  const nextAction = req.headers.get('next-action');
  if (nextAction) {
    // 正規のServer Action IDは8文字以上の16進数ハッシュ
    const isValidActionId = /^[0-9a-f]{8,}$/i.test(nextAction);
    if (!isValidActionId) {
      return new NextResponse('Invalid request', { status: 400 });
    }
  }

  // JWT tokenを直接取得（auth()ラッパー不使用 — Edge Runtimeで安定）
  // NextAuth v5はcookie名が変わった: "authjs.session-token" (dev) / "__Secure-authjs.session-token" (prod)
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? '';
  // NextAuth sets cookie name based on NEXTAUTH_URL (https → __Secure- prefix)
  // Behind reverse proxy (Nginx SSL termination), req.nextUrl.protocol is 'http:'
  // but the actual cookie uses __Secure- prefix because NEXTAUTH_URL is https
  // → Try both cookie names to handle reverse proxy setups
  const hasSecureCookie = req.cookies.has('__Secure-authjs.session-token');
  const cookieName = hasSecureCookie
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
  let token: { onboardingStep?: string | null; sub?: string } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    token = await getToken({ req, secret, cookieName }) as any;
  } catch {
    // getToken失敗時は未認証として扱う
  }
  const isLoggedIn = !!token;
  const onboardingStep = token?.onboardingStep;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isApiAuth = pathname.startsWith('/api/auth');
  const isHealthCheck = pathname === '/api/health';
  const isOnboardingPath = pathname.startsWith('/onboarding');
  const isDeeplinkPath = pathname.startsWith('/c/');
  const isApiPath = pathname.startsWith('/api/');
  const isNextPath = pathname.startsWith('/_next');

  const isPublicPage =
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/pricing' ||
    pathname === '/moments' ||
    pathname === '/offline' ||
    pathname === '/discover' ||
    pathname.startsWith('/user/') ||
    pathname.startsWith('/legal/');  // 公開プロフィールページ

  const isPublicApi =
    pathname.startsWith('/api/users/') ||  // 公開プロフィールAPI
    pathname.startsWith('/api/characters') ||
    pathname.startsWith('/api/moments') ||
    pathname.startsWith('/api/push/subscribe') ||
    pathname.startsWith('/api/push/character-notify') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/chat/comment-reply') ||
    pathname.startsWith('/api/onboarding/guest-chat') ||
    pathname === '/api/coins/packages' ||
    pathname.startsWith('/api/geoip') ||
    pathname.startsWith('/api/og') ||
    pathname.startsWith('/api/events') ||
    pathname.startsWith('/api/stories') ||
    pathname === '/api/build-id';

  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  // /api/auth/login は NextAuth の有効なアクションではない
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 常に通過: api/auth, health, public api, /_next
  if (isApiAuth || isHealthCheck || isPublicApi || isNextPath) {
    return withSecurityHeaders(NextResponse.next(), req);
  }

  // /c/[slug] はServer Componentで認証・onboarding・リダイレクト処理を一元管理
  if (isDeeplinkPath) {
    return withSecurityHeaders(NextResponse.next(), req);
  }

  // Admin paths
  if (isAdminPath) {
    if (!isLoggedIn) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return withSecurityHeaders(NextResponse.next(), req);
  }

  // Demo mode: block signup unless invite code
  const INVITE_CODE = process.env.INVITE_CODE;
  if (INVITE_CODE && pathname.startsWith('/signup')) {
    const code = req.nextUrl.searchParams.get('code');
    const fromPromise = req.nextUrl.searchParams.get('from') === 'promise';
    if (code !== INVITE_CODE && !fromPromise) {
      return NextResponse.redirect(new URL('/login?error=invite_only', req.url));
    }
  }

  // 認証ページ（login/signup）
  if (isAuthPage) {
    if (isLoggedIn) {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
      if (callbackUrl && (callbackUrl.startsWith('/c/') || callbackUrl.startsWith('/explore'))) {
        return NextResponse.redirect(new URL(callbackUrl, req.url));
      }
      if (onboardingStep !== 'completed') {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
      return NextResponse.redirect(new URL('/explore', req.url));
    }
    return withSecurityHeaders(NextResponse.next(), req);
  }

  // 未認証: 公開ページは通過、APIは401、その他は/loginへ
  if (!isLoggedIn) {
    if (isPublicPage) {
      return withSecurityHeaders(NextResponse.next(), req);
    }
    if (isApiPath) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // === 認証済みユーザーのオンボーディングロジック ===
  if (isOnboardingPath) {
    if (onboardingStep === 'completed') {
      return NextResponse.redirect(new URL('/explore', req.url));
    }
    return withSecurityHeaders(NextResponse.next(), req);
  }

  if (isApiPath) {
    return withSecurityHeaders(NextResponse.next(), req);
  }

  if (onboardingStep !== 'completed') {
    if (isPublicPage) {
      return withSecurityHeaders(NextResponse.next(), req);
    }
    const isProtectedButAllowed =
      pathname.startsWith('/explore') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/timeline') ||
      pathname.startsWith('/mypage');
    if (isProtectedButAllowed) {
      return withSecurityHeaders(NextResponse.next(), req);
    }
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return withSecurityHeaders(NextResponse.next(), req);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|robots.txt|sitemap.xml|sw.js|manifest.json|icons|uploads|characters).*)'],
};
