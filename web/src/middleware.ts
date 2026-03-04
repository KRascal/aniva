import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // 静的アセットと公開パスを除外
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads/|characters/|api/auth|api/users/|api/onboarding/guest-chat|api/characters|user/|c/|login|signup|explore$|moments$).*)',
  ],
};
