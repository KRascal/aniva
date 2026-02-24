import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');
  const isHealthCheck = req.nextUrl.pathname === '/api/health';
  const isPublicPage = req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/about' || req.nextUrl.pathname === '/terms' || req.nextUrl.pathname === '/privacy' || req.nextUrl.pathname === '/pricing' || req.nextUrl.pathname === '/moments' || req.nextUrl.pathname === '/explore' || req.nextUrl.pathname.startsWith('/profile/');
  const isPublicApi = req.nextUrl.pathname.startsWith('/api/characters') || req.nextUrl.pathname.startsWith('/api/moments') || req.nextUrl.pathname.startsWith('/api/push/subscribe') || req.nextUrl.pathname.startsWith('/api/webhook') || req.nextUrl.pathname.startsWith('/api/cron');
  const isAdminPath = req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api/admin');

  if (isApiAuth || isPublicPage || isHealthCheck || isPublicApi) {
    return NextResponse.next();
  }

  // Admin paths: require auth (admin email check is done at page/API level)
  if (isAdminPath) {
    if (!isLoggedIn) {
      if (req.nextUrl.pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Demo mode: block signup unless invite code is provided
  const INVITE_CODE = process.env.INVITE_CODE;
  if (INVITE_CODE && req.nextUrl.pathname.startsWith('/signup')) {
    const code = req.nextUrl.searchParams.get('code');
    if (code !== INVITE_CODE) {
      return NextResponse.redirect(new URL('/login?error=invite_only', req.url));
    }
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/explore', req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    // For API routes, return 401 instead of redirecting
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
