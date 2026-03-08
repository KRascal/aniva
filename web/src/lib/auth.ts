import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';

const WELCOME_COINS = 500; // 初回登録ボーナス

async function grantWelcomeCoins(userId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const balance = await tx.coinBalance.upsert({
        where: { userId },
        create: { userId, balance: WELCOME_COINS, freeBalance: WELCOME_COINS, paidBalance: 0 },
        update: { balance: { increment: WELCOME_COINS }, freeBalance: { increment: WELCOME_COINS } },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          type: 'BONUS',
          amount: WELCOME_COINS,
          balanceAfter: balance.balance,
          description: '新規登録ボーナス 🎉',
        },
      });
    });
  } catch (e) {
    console.error('[grantWelcomeCoins] failed:', e);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
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
          // 新規ユーザーに無料コイン付与 (500コイン)
          await grantWelcomeCoins(user.id);
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
    async jwt({ token, user, trigger, account, profile }) {
      if (user) {
        token.userId = user.id;
      }

      // Google OAuthサインイン時: JWTモードではAdapterがUser作成をスキップする場合がある
      // DBにユーザーが存在しなければ作成する
      if (trigger === 'signIn' && token.userId) {
        const existingUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { id: true },
        });
        if (!existingUser) {
          // JWTのsub/emailから作成を試みる
          const email = (token.email ?? user?.email ?? '') as string;
          const name = (token.name ?? user?.name ?? email.split('@')[0]) as string;

          // メールで既存ユーザーを検索（重複防止）
          let dbUser = email ? await prisma.user.findUnique({ where: { email } }) : null;
          if (dbUser) {
            // 既存ユーザーのIDをトークンに反映
            token.userId = dbUser.id;
          } else {
            // 新規作成
            dbUser = await prisma.user.create({
              data: {
                id: token.userId as string,
                email: email ?? `user-${token.userId as string}@aniva.local`,
                displayName: name ?? email?.split('@')[0] ?? 'User',
                emailVerified: account?.provider === 'google' ? new Date() : null,
              },
            });
            // 新規ユーザーに無料コイン付与 (500コイン)
            await grantWelcomeCoins(dbUser.id);
          }
        }
      }

      // onboardingStepが未完了の場合は毎回DB参照（完了後はスキップ）
      // signIn/update時は常にDB参照
      const needsRefresh = trigger === 'signIn' || trigger === 'update' || token.onboardingStep !== 'completed';
      if (needsRefresh) {
        // token.userIdが未セットの場合（Google OAuth再ログイン等）、emailからDB検索
        if (!token.userId && token.email) {
          const emailUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true },
          });
          if (emailUser) {
            token.userId = emailUser.id;
          }
        }
        if (token.userId) {
          let dbUser = await prisma.user.findUnique({
            where: { id: token.userId as string },
            select: { id: true, onboardingStep: true, nickname: true },
          });
          // JWT IDでユーザーが見つからない場合、emailで検索（JWT/DB ID不一致対策）
          if (!dbUser && token.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              select: { id: true, onboardingStep: true, nickname: true },
            });
            if (dbUser) {
              token.userId = dbUser.id; // JWTのIDを修正
            }
          }
          token.onboardingStep = dbUser?.onboardingStep ?? null;
          token.nickname = dbUser?.nickname ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.userId) {
          session.user.id = token.userId;
        }
        session.user.onboardingStep = token.onboardingStep ?? null;
        session.user.nickname = token.nickname ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
