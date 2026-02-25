import type { NextAuthConfig } from 'next-auth';

// Minimal auth config for Edge runtime (middleware) - no PrismaAdapter
export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    async jwt({ token }) {
      // JWTトークンをそのまま通す（onboardingStepはauth.tsで設定済み）
      return token;
    },
    async session({ session, token }) {
      // JWTのonboardingStep/nicknameをセッションに伝播
      if (session.user) {
        (session.user as any).id = token.userId ?? token.sub;
        (session.user as any).onboardingStep = token.onboardingStep ?? null;
        (session.user as any).nickname = token.nickname ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
