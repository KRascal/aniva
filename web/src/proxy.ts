import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  // req.auth?.user はNextAuth拡張型。onboardingStepはカスタムフィールドのため型キャストが必要
  type AuthUser = { onboardingStep?: string | null };
  const onboardingStep = (req.auth?.user as AuthUser | undefined)?.onboardingStep;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isApiAuth = pathname.startsWith('/api/auth');
  const isHealthCheck = pathname === '/api/health';
  const isOnboardingPath = pathname.startsWith('/onboarding');
  // /c/[slug] はServer Componentで認証・リダイレクト処理を行うため通過
  const isDeeplinkPath = pathname.startsWith('/c/');
  const isApiPath = pathname.startsWith('/api/');
  const isNextPath = pathname.startsWith('/_next');
  // 未認証でもアクセス可能な公開ページ
  const isPublicPage =
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/pricing' ||
    pathname === '/moments' ||
    pathname === '/offline' ||
    pathname === '/discover';   // Phase 3: 気配の空間（未ログインOK）
  const isPublicApi =
    pathname.startsWith('/api/characters') ||
    pathname.startsWith('/api/moments') ||
    pathname.startsWith('/api/push/subscribe') ||
    pathname.startsWith('/api/push/character-notify') ||  // cron push-dm が内部呼び出し (x-cron-secret で自己認証)
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/onboarding/guest-chat') ||  // 邂逅フロー ゲストチャット
    pathname === '/api/coins/packages';  // 料金ページ（未ログインでも表示）
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  // /api/auth/login は NextAuth の有効なアクションではない（有効なのは signin, signout, callback 等）
  // ボット・クローラー等が直接アクセスしてくると NextAuth が UnknownAction エラーを吐くため、
  // ここで /login へリダイレクトして NextAuth に到達させない
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 常に通過: api/auth, health, public api, /_next
  if (isApiAuth || isHealthCheck || isPublicApi || isNextPath) {
    return NextResponse.next();
  }

  // /c/[slug] はServer Componentで認証・onboarding・リダイレクト処理を一元管理
  if (isDeeplinkPath) {
    return NextResponse.next();
  }

  // Admin paths: require auth (admin email check is done at page/API level)
  if (isAdminPath) {
    if (!isLoggedIn) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Demo mode: block signup unless invite code is provided
  // PromiseSeal経由（from=promise）は招待コード不要（/c/[slug]のゲストチャット後のサインアップ）
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
      // callbackUrlがあればそこへ（/c/slugからの認証フロー対応）
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
      if (callbackUrl && (callbackUrl.startsWith('/c/') || callbackUrl.startsWith('/explore'))) {
        return NextResponse.redirect(new URL(callbackUrl, req.url));
      }
      // オンボーディング未完了の場合は/onboardingへ
      if (onboardingStep !== 'completed') {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
      return NextResponse.redirect(new URL('/explore', req.url));
    }
    return NextResponse.next();
  }

  // 未認証: 公開ページは通過、APIは401、その他は/loginへ
  if (!isLoggedIn) {
    if (isPublicPage) {
      return NextResponse.next();
    }
    if (isApiPath) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // === 認証済みユーザーのオンボーディングロジック ===

  // /onboarding パス
  if (isOnboardingPath) {
    // 完了済みなら/exploreへ
    if (onboardingStep === 'completed') {
      return NextResponse.redirect(new URL('/explore', req.url));
    }
    return NextResponse.next();
  }

  // APIパスは通過
  if (isApiPath) {
    return NextResponse.next();
  }

  // オンボーディング未完了 → /onboarding へリダイレクト
  // ただし公開ページは通過（LP→キャラ→認証→キャラ再選択のループ防止）
  if (onboardingStep !== 'completed') {
    if (isPublicPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|robots.txt|sitemap.xml|sw.js|manifest.json|icons|uploads|characters).*)'],
};
