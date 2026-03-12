import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  // connection_limit: ユーザー増加に対応するプールサイズ設定
  // 本番: 20 / 開発: 5 (サーバーリソースに合わせて調整)
  const poolSize = process.env.NODE_ENV === 'production' ? 20 : 5;
  const adapter = new PrismaPg({ connectionString, max: poolSize })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
