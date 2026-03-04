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
        session.user.id = (token.userId ?? token.sub) as string;
        session.user.onboardingStep = token.onboardingStep ?? null;
        session.user.nickname = token.nickname ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
