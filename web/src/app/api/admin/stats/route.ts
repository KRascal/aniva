import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    activeUsers,
    activeUsersYesterday,
    totalMessages,
    totalConversations,
    monthlyNewUsers,
    prevMonthNewUsers,
    subscriptions,
    topCharacters,
    newUsersRaw,
    conversationsRaw,
    recentConversations,
    recentRegistrations,
    recentPayments,
    monthlyRevenue,
    lastMonthRevenue,
    totalUsersYesterday,
    totalMessagesYesterday,
  ] = await Promise.all([
    prisma.user.count(),
    // Active = had a message in last 24h
    prisma.relationship.count({ where: { lastMessageAt: { gte: yesterday } } }),
    // Active yesterday (48h-24h ago)
    prisma.relationship.count({
      where: {
        lastMessageAt: {
          gte: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          lt: yesterday,
        },
      },
    }),
    prisma.message.count(),
    prisma.conversation.count(),
    // New users this month
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    // New users last month
    prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
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
        avatarUrl: true,
        _count: { select: { relationships: true } },
        relationships: { select: { totalMessages: true } },
      },
      orderBy: { relationships: { _count: 'desc' } },
      take: 10,
    }),
    // New users 7-day chart
    prisma.$queryRaw<{ day: string; count: string }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    // Conversations 7-day chart
    prisma.$queryRaw<{ day: string; count: string }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "Conversation"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    // Recent conversations (last 10)
    prisma.conversation.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        relationship: {
          include: {
            user: { select: { email: true, displayName: true } },
            character: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    }),
    // Recent registrations (last 5)
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, displayName: true, createdAt: true },
    }),
    // Recent payments
    prisma.characterSubscription.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pricePaidJpy: true,
        createdAt: true,
        user: { select: { email: true, displayName: true } },
        character: { select: { name: true } },
      },
    }),
    // Monthly revenue (CharacterSubscription)
    prisma.characterSubscription.aggregate({
      _sum: { pricePaidJpy: true },
      where: { createdAt: { gte: monthStart } },
    }),
    // Last month revenue
    prisma.characterSubscription.aggregate({
      _sum: { pricePaidJpy: true },
      where: { createdAt: { gte: lastMonthStart, lt: monthStart } },
    }),
    // Users count yesterday for comparison
    prisma.user.count({ where: { createdAt: { lt: yesterday } } }),
    // Messages yesterday
    prisma.message.count({ where: { createdAt: { lt: yesterday } } }),
  ]);

  // Build 7-day chart data
  const buildWeekChart = (raw: { day: string; count: string }[]) => {
    const chart: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const found = raw.find((r) => r.day === key || String(r.day).startsWith(key));
      chart.push({ day: key, count: found ? Number(found.count) : 0 });
    }
    return chart;
  };

  const charRanking = (topCharacters as {
    id: string; name: string; franchise: string; isActive: boolean; avatarUrl: string | null;
    _count: { relationships: number }; relationships: { totalMessages: number }[];
  }[]).map((c) => ({
    id: c.id,
    name: c.name,
    franchise: c.franchise,
    isActive: c.isActive,
    avatarUrl: c.avatarUrl,
    messageCount: c.relationships.reduce((s, r) => s + r.totalMessages, 0),
    followerCount: c._count.relationships,
  }));

  const subSummary = {
    total: subscriptions.reduce((s, r) => s + r._count.id, 0),
    byPlan: subscriptions.map((r) => ({ plan: r.plan, count: r._count.id })),
  };

  const monthRevJpy = monthlyRevenue._sum.pricePaidJpy || 0;
  const lastMonthRevJpy = lastMonthRevenue._sum.pricePaidJpy || 0;

  // Activity feed
  type RecentConvItem = {
    id: string;
    relationship: {
      user: { email: string | null; displayName: string | null };
      character: { name: string; avatarUrl: string | null };
    };
    createdAt: Date;
  };
  type RecentRegItem = { id: string; email: string | null; displayName: string | null; createdAt: Date };
  type RecentPayItem = {
    id: string; pricePaidJpy: number; createdAt: Date;
    user: { email: string | null; displayName: string | null };
    character: { name: string };
  };

  const activityFeed = [
    ...(recentConversations as RecentConvItem[]).map((c) => ({
      type: 'conversation' as const,
      id: c.id,
      userEmail: c.relationship.user.email,
      userName: c.relationship.user.displayName,
      characterName: c.relationship.character.name,
      characterAvatar: c.relationship.character.avatarUrl,
      createdAt: c.createdAt.toISOString(),
    })),
    ...(recentRegistrations as RecentRegItem[]).map((u) => ({
      type: 'registration' as const,
      id: u.id,
      userEmail: u.email,
      userName: u.displayName,
      characterName: null,
      characterAvatar: null,
      createdAt: u.createdAt.toISOString(),
    })),
    ...(recentPayments as RecentPayItem[]).map((p) => ({
      type: 'payment' as const,
      id: p.id,
      userEmail: p.user.email,
      userName: p.user.displayName,
      characterName: p.character.name,
      characterAvatar: null,
      amount: p.pricePaidJpy,
      createdAt: p.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  const newUsersGrowth = prevMonthNewUsers > 0
    ? ((monthlyNewUsers - prevMonthNewUsers) / prevMonthNewUsers) * 100
    : monthlyNewUsers > 0 ? 100 : 0;

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalMessages,
    totalConversations,
    monthlyNewUsers,
    monthlyRevenueJpy: monthRevJpy,
    prevMonthRevenueJpy: lastMonthRevJpy,
    totalUsersGrowth: totalUsersYesterday > 0
      ? ((totalUsers - totalUsersYesterday) / totalUsersYesterday) * 100
      : 0,
    activeUsersGrowth: activeUsersYesterday > 0
      ? ((activeUsers - activeUsersYesterday) / activeUsersYesterday) * 100
      : 0,
    totalMessagesGrowth: totalMessagesYesterday > 0
      ? ((totalMessages - totalMessagesYesterday) / totalMessagesYesterday) * 100
      : 0,
    newUsersGrowth,
    subscriptions: subSummary,
    topCharacters: charRanking,
    newUsersChart: buildWeekChart(newUsersRaw),
    conversationsChart: buildWeekChart(conversationsRaw),
    activityFeed,
  });
}
