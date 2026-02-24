import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');
  const isHealthCheck = req.nextUrl.pathname === '/api/health';
  const isPublicPage = req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/about' || req.nextUrl.pathname === '/terms' || req.nextUrl.pathname === '/privacy';

  if (isApiAuth || isPublicPage || isHealthCheck) {
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
      return NextResponse.redirect(new URL('/chat', req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
