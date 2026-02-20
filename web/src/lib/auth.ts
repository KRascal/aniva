import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Email magic link will be added when email service is configured
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email as string;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, displayName: email.split('@')[0] },
          });
        }
        return { id: user.id, email: user.email, name: user.displayName };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
