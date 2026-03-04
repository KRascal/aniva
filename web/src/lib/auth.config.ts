import type { NextAuthConfig } from 'next-auth';

// Minimal auth config for Edge runtime (middleware) - no PrismaAdapter
export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized() {
      // 認証制御は全て proxy.ts で行う。authorized は常に true を返す
      return true;
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
