import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers, totalMessages, subscriptions, topCharacters, newUsersRaw] =
    await Promise.all([
      prisma.user.count(),
      prisma.relationship.count({
        where: { lastMessageAt: { gte: yesterday } },
      }),
      prisma.message.count(),
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: { id: true },
        where: { status: 'ACTIVE' },
      }),
      prisma.character.findMany({
        select: {
          id: true,
          name: true,
          franchise: true,
          isActive: true,
          _count: { select: { relationships: true } },
          relationships: {
            select: { totalMessages: true },
          },
        },
        orderBy: { relationships: { _count: 'desc' } },
        take: 10,
      }),
      prisma.$queryRaw<{ day: string; count: string }[]>`
        SELECT DATE("createdAt") as day, COUNT(*) as count
        FROM "User"
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `,
    ]);

  // Build 7-day chart data
  const chartData: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    const found = newUsersRaw.find((r: { day: string; count: string }) => r.day === key);
    chartData.push({ day: key, count: found ? Number(found.count) : 0 });
  }

  const charRanking = topCharacters.map((c: { id: string; name: string; franchise: string; isActive: boolean; _count: { relationships: number }; relationships: { totalMessages: number }[] }) => ({
    id: c.id,
    name: c.name,
    franchise: c.franchise,
    isActive: c.isActive,
    messageCount: c.relationships.reduce((s: number, r: { totalMessages: number }) => s + r.totalMessages, 0),
    followerCount: c._count.relationships,
  }));

  const subSummary = {
    total: subscriptions.reduce((s: number, r: { _count: { id: number } }) => s + r._count.id, 0),
    byPlan: subscriptions.map((r: { plan: string; _count: { id: number } }) => ({ plan: r.plan, count: r._count.id })),
  };

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalMessages,
    subscriptions: subSummary,
    topCharacters: charRanking,
    newUsersChart: chartData,
  });
}
