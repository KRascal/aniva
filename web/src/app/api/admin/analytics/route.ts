import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    userGrowthRaw,
    characterMessages,
    planDistribution,
    fanclubStats,
    bondLevelDist,
  ] = await Promise.all([
    // User growth (30 days)
    prisma.$queryRaw<{ day: string; count: string }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    // Character message counts
    prisma.character.findMany({
      select: {
        id: true,
        name: true,
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
  ]);

  const totalRelationships = await prisma.relationship.count();

  // Build 30-day chart
  const userGrowthChart: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    const found = userGrowthRaw.find((r: { day: string; count: string }) => r.day === key);
    userGrowthChart.push({ day: key, count: found ? Number(found.count) : 0 });
  }

  const charMsgData = characterMessages.map((c: { id: string; name: string; relationships: { totalMessages: number }[] }) => ({
    id: c.id,
    name: c.name,
    messageCount: c.relationships.reduce((s: number, r: { totalMessages: number }) => s + r.totalMessages, 0),
  })).sort((a: { messageCount: number }, b: { messageCount: number }) => b.messageCount - a.messageCount).slice(0, 10);

  return NextResponse.json({
    userGrowthChart,
    characterMessages: charMsgData,
    planDistribution: planDistribution.map((r: { plan: string; _count: { id: number } }) => ({ plan: r.plan, count: r._count.id })),
    fanclubRate: totalRelationships > 0 ? (fanclubStats._count.id / totalRelationships) * 100 : 0,
    fanclubCount: fanclubStats._count.id,
    totalRelationships,
    bondLevelDistribution: bondLevelDist.map((r: { level: number; _count: { id: number } }) => ({ level: r.level, count: r._count.id })),
  });
}
