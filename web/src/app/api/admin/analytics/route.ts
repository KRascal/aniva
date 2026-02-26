import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userGrowthRaw,
    conversationsRaw,
    characterMessages,
    planDistribution,
    fanclubStats,
    bondLevelDist,
    // Retention: users registered 30d ago
    usersRegistered30d,
    usersRegistered7d,
    usersRegistered1d,
    // Active users (had message) per cohort
    activeFrom30d,
    activeFrom7d,
    activeFrom1d,
  ] = await Promise.all([
    // User growth (30 days)
    prisma.$queryRaw<{ day: string; count: string }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    // Conversations per day (30 days)
    prisma.$queryRaw<{ day: string; count: string }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "Conversation"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    // Character message counts
    prisma.character.findMany({
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        relationships: { select: { totalMessages: true } },
      },
    }),
    // Plan distribution
    prisma.user.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),
    // Fanclub stats
    prisma.relationship.aggregate({
      _count: { id: true },
      where: { isFanclub: true },
    }),
    // Bond level distribution
    prisma.relationship.groupBy({
      by: ['level'],
      _count: { id: true },
      orderBy: { level: 'asc' },
    }),
    // Retention: total users registered 30d, 7d, 1d ago
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    // Active from 30d cohort (had a message in last 7 days)
    prisma.relationship.count({
      where: {
        user: { createdAt: { gte: thirtyDaysAgo } },
        lastMessageAt: { gte: sevenDaysAgo },
      },
    }),
    // Active from 7d cohort (had a message in last 24h)
    prisma.relationship.count({
      where: {
        user: { createdAt: { gte: sevenDaysAgo } },
        lastMessageAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    // Active from 1d cohort (had any message ever)
    prisma.relationship.count({
      where: {
        user: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        totalMessages: { gt: 0 },
      },
    }),
  ]);

  const totalRelationships = await prisma.relationship.count();

  // Build 30-day chart (fill missing days with 0)
  const buildMonthChart = (raw: { day: string; count: string }[]) => {
    const chart: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const found = raw.find((r) => String(r.day).startsWith(key));
      chart.push({ day: key, count: found ? Number(found.count) : 0 });
    }
    return chart;
  };

  const charMsgData = (characterMessages as {
    id: string; name: string; avatarUrl: string | null;
    relationships: { totalMessages: number }[];
  }[]).map((c) => ({
    id: c.id,
    name: c.name,
    avatarUrl: c.avatarUrl,
    messageCount: c.relationships.reduce((s, r) => s + r.totalMessages, 0),
  })).sort((a, b) => b.messageCount - a.messageCount).slice(0, 10);

  const totalMsgs = charMsgData.reduce((s, c) => s + c.messageCount, 0);

  // Character share for pie-style display
  const characterShare = charMsgData.slice(0, 6).map((c, i) => ({
    ...c,
    share: totalMsgs > 0 ? (c.messageCount / totalMsgs) * 100 : 0,
    colorIndex: i,
  }));

  // Retention metrics
  const retentionData = [
    {
      label: 'Day 1 (登録当日)',
      registered: usersRegistered1d,
      active: activeFrom1d,
      rate: usersRegistered1d > 0 ? (activeFrom1d / usersRegistered1d) * 100 : 0,
    },
    {
      label: 'Day 7 (7日以内登録)',
      registered: usersRegistered7d,
      active: activeFrom7d,
      rate: usersRegistered7d > 0 ? (activeFrom7d / usersRegistered7d) * 100 : 0,
    },
    {
      label: 'Day 30 (30日以内登録)',
      registered: usersRegistered30d,
      active: activeFrom30d,
      rate: usersRegistered30d > 0 ? (activeFrom30d / usersRegistered30d) * 100 : 0,
    },
  ];

  return NextResponse.json({
    userGrowthChart: buildMonthChart(userGrowthRaw),
    conversationsChart: buildMonthChart(conversationsRaw),
    characterMessages: charMsgData,
    characterShare,
    planDistribution: (planDistribution as { plan: string; _count: { id: number } }[]).map((r) => ({ plan: r.plan, count: r._count.id })),
    fanclubRate: totalRelationships > 0 ? (fanclubStats._count.id / totalRelationships) * 100 : 0,
    fanclubCount: fanclubStats._count.id,
    totalRelationships,
    bondLevelDistribution: (bondLevelDist as { level: number; _count: { id: number } }[]).map((r) => ({ level: r.level, count: r._count.id })),
    retentionData,
    totalConversations: (conversationsRaw as { day: string; count: string }[]).reduce((s, r) => s + Number(r.count), 0),
  });
}
