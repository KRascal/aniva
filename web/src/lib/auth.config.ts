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
  },
} satisfies NextAuthConfig;
