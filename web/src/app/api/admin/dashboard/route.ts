import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Weekly DAU: last 7 days
    const weeklyDauPromises = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = dayStart.toISOString().split('T')[0];
      return prisma.relationship.count({
        where: { lastMessageAt: { gte: dayStart, lt: dayEnd } },
      }).then((count) => ({ date: dateStr, count }));
    });

    const [
      todayDau,
      todayNewUsers,
      todayMessages,
      todayRevenue,
      lowStreakCount,
      weeklyDauRaw,
    ] = await Promise.all([
      // DAU: RelationshipsでlastMessageAtが今日のユーザー数（ユニーク）
      prisma.relationship.groupBy({
        by: ['userId'],
        where: { lastMessageAt: { gte: todayStart } },
      }).then((rows) => rows.length),

      // 今日の新規ユーザー数
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // 今日のチャット数（USERロールのみ）
      prisma.message.count({
        where: {
          createdAt: { gte: todayStart },
          role: 'USER',
        },
      }),

      // 今日のコイン収益（PURCHASE）
      prisma.coinTransaction.aggregate({
        where: {
          createdAt: { gte: todayStart },
          type: 'PURCHASE',
        },
        _sum: { amount: true },
      }).then((r) => r._sum.amount ?? 0),

      // 低ストリークユーザー（streakDays が 0 または 1 のRelationship数）
      prisma.relationship.count({
        where: { streakDays: { lte: 1 } },
      }),

      // 直近7日DAU
      Promise.all(weeklyDauPromises),
    ]);

    return NextResponse.json({
      today: {
        dau: todayDau,
        newUsers: todayNewUsers,
        totalMessages: todayMessages,
        revenue: todayRevenue,
      },
      alerts: {
        reportCount: 0,    // Reportモデル未実装
        lowStreakCount,
        errorCount: 0,     // エラーログ未実装
      },
      weeklyDau: weeklyDauRaw.reverse(), // 古い日付から昇順に
    });
  } catch (err) {
    logger.error('[dashboard] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
