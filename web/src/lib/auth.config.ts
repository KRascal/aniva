import type { NextAuthConfig } from 'next-auth';

// Minimal auth config for Edge runtime (middleware) - no PrismaAdapter
export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // 公開ページ・APIは認証不要
      const publicPaths = [
        '/login',
        '/signup',
        '/c/',           // オンボーディング（ゲスト体験）
        '/user/',         // 公開プロフィール
        '/api/users/',    // 公開プロフィールAPI
        '/api/onboarding/guest-chat',
        '/api/characters',
        '/api/auth',
        '/explore',
        '/moments',
        '/',
      ];
      if (publicPaths.some(p => pathname.startsWith(p) || pathname === p)) {
        return true;
      }
      return !!auth?.user;
    },
    async jwt({ token }) {
      // JWTトークンをそのまま通す（onboardingStepはauth.tsで設定済み）
      return token;
    },
    async session({ session, token }) {
      // JWTのonboardingStep/nicknameをセッションに伝播
      if (session.user) {
        session.user.id = (token.userId ?? token.sub) as string;
        session.user.onboardingStep = token.onboardingStep ?? null;
        session.user.nickname = token.nickname ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
