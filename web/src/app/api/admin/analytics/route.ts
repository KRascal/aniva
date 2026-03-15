import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    userGrowthRaw,
    conversationsRaw,
    characterMessages,
    planDistribution,
    fanclubStats,
    bondLevelDist,
    usersRegistered30d,
    usersRegistered7d,
    usersRegistered1d,
    activeFrom30d,
    activeFrom7d,
    activeFrom1d,
    // Today's metrics
    todayActiveUsersRaw,
    todayMessages,
    todayFanclubJoins,
    todayCoinSpend,
    popularPosts,
    // DAU for last 7 days
    dauRaw,
    // Today messages by character
    todayCharMsgsRaw,
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
    // Character message counts (cumulative)
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
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.relationship.count({
      where: {
        user: { createdAt: { gte: thirtyDaysAgo } },
        lastMessageAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.relationship.count({
      where: {
        user: { createdAt: { gte: sevenDaysAgo } },
        lastMessageAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.relationship.count({
      where: {
        user: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        totalMessages: { gt: 0 },
      },
    }),
    // Today active users (distinct by conversationId -> unique relationships)
    prisma.message.findMany({
      where: { role: 'USER', createdAt: { gte: todayStart } },
      select: { conversation: { select: { relationship: { select: { userId: true } } } } },
      distinct: ['conversationId'],
    }),
    // Today total messages
    prisma.message.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Today new fanclub joins
    prisma.relationship.count({
      where: { isFanclub: true, updatedAt: { gte: todayStart } },
    }),
    // Today coin spend (negative amounts = spend)
    prisma.coinTransaction.aggregate({
      where: { createdAt: { gte: todayStart }, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    // Popular posts by viewCount
    prisma.$queryRaw<{ id: string; title: string; characterId: string; characterName: string; viewCount: number }[]>`
      SELECT ft.id, ft.title, ft."characterId", c.name as "characterName", ft."viewCount"
      FROM "FanThread" ft
      JOIN "Character" c ON c.id = ft."characterId"
      ORDER BY ft."viewCount" DESC
      LIMIT 10
    `,
    // DAU for last 7 days
    prisma.$queryRaw<{ day: string; dau: string }[]>`
      SELECT DATE(m."createdAt") as day, COUNT(DISTINCT r."userId") as dau
      FROM "Message" m
      JOIN "Conversation" conv ON conv.id = m."conversationId"
      JOIN "Relationship" r ON r.id = conv."relationshipId"
      WHERE m."createdAt" >= ${sevenDaysAgo}
        AND m.role = 'USER'
      GROUP BY DATE(m."createdAt")
      ORDER BY day ASC
    `,
    // Today messages by character
    prisma.$queryRaw<{ characterId: string; characterName: string; count: string }[]>`
      SELECT r."characterId", c.name as "characterName", COUNT(*) as count
      FROM "Message" m
      JOIN "Conversation" conv ON conv.id = m."conversationId"
      JOIN "Relationship" r ON r.id = conv."relationshipId"
      JOIN "Character" c ON c.id = r."characterId"
      WHERE m."createdAt" >= ${todayStart}
        AND m.role = 'USER'
      GROUP BY r."characterId", c.name
      ORDER BY count DESC
      LIMIT 10
    `,
  ]);

  const totalRelationships = await prisma.relationship.count();

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

  // Build 7-day DAU chart
  const build7DayDauChart = (raw: { day: string; dau: string }[]) => {
    const chart: { day: string; dau: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const found = raw.find((r) => String(r.day).startsWith(key));
      chart.push({ day: key, dau: found ? Number(found.dau) : 0 });
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

  const characterShare = charMsgData.slice(0, 6).map((c, i) => ({
    ...c,
    share: totalMsgs > 0 ? (c.messageCount / totalMsgs) * 100 : 0,
    colorIndex: i,
  }));

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

  // Today active users: extract unique userIds
  const todayActiveUserIds = new Set(
    (todayActiveUsersRaw as { conversation: { relationship: { userId: string } | null } | null }[])
      .map((m) => m.conversation?.relationship?.userId)
      .filter(Boolean)
  );

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
    // Today's KPIs
    todayActiveUsers: todayActiveUserIds.size,
    todayMessages,
    todayFanclubJoins,
    todayCoinSpend: Math.abs(todayCoinSpend._sum.amount ?? 0),
    popularPosts: (popularPosts as { id: string; title: string; characterId: string; characterName: string; viewCount: number }[]),
    dau7Days: build7DayDauChart(dauRaw),
    todayCharMessages: (todayCharMsgsRaw as { characterId: string; characterName: string; count: string }[]).map((r) => ({
      characterId: r.characterId,
      characterName: r.characterName,
      count: Number(r.count),
    })),
  });
  } catch (error) {
    logger.error('[admin/analytics] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
