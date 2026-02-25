import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: [], // Disable PKCE checks for HTTP environment compatibility
    }),
    // Email OTP (6-digit code) authentication
    Credentials({
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const code = (credentials.code as string).trim();
        const now = new Date();

        // Find a valid, unused, non-expired code using raw SQL (Prisma v7 adapter compatibility)
        const rows = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
          SELECT id, email FROM "VerificationCode"
          WHERE email = ${email}
            AND code = ${code}
            AND used = false
            AND "expiresAt" > ${now}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `;

        if (!rows || rows.length === 0) return null;

        const verificationCodeId = rows[0].id;

        // Mark code as used
        await prisma.$executeRaw`
          UPDATE "VerificationCode" SET used = true WHERE id = ${verificationCodeId}
        `;

        // Find or create user
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              displayName: email.split('@')[0],
              emailVerified: new Date(),
            },
          });
        } else if (!user.emailVerified) {
          // Mark email as verified on first OTP success
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        return { id: user.id, email: user.email, name: user.displayName };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
      }
      // サインイン時 or 明示的なセッション更新時にDBからonboardingStep/nicknameを取得
      // trigger === 'update' はクライアントから useSession().update() を呼ばれたとき
      if (token.userId && (trigger === 'signIn' || trigger === 'update')) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { onboardingStep: true, nickname: true },
        });
        token.onboardingStep = dbUser?.onboardingStep ?? null;
        token.nickname = dbUser?.nickname ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.userId) {
          (session.user as any).id = token.userId;
        }
        (session.user as any).onboardingStep = token.onboardingStep ?? null;
        (session.user as any).nickname = token.nickname ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
