import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Guard: if addiction v2 tables not yet migrated, return placeholder
  try {
    await prisma.userCard.count();
  } catch {
    return NextResponse.json({ error: '中毒v2 DBマイグレーション未適用。管理者に連絡してください。' }, { status: 503 });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  // ストリーク統計
  const allRelationships = await prisma.relationship.findMany({
    select: {
      streakDays: true,
      pendingCliffhanger: true,
      characterId: true,
      user: { select: { id: true, displayName: true, email: true } },
      character: { select: { name: true } },
    },
  });

  const streakDist = { zero: 0, one_to_six: 0, seven_to_29: 0, thirty_plus: 0 };
  let totalStreak = 0;
  let maxStreak = 0;
  for (const r of allRelationships) {
    const s = r.streakDays;
    if (s === 0) streakDist.zero++;
    else if (s <= 6) streakDist.one_to_six++;
    else if (s <= 29) streakDist.seven_to_29++;
    else streakDist.thirty_plus++;
    totalStreak += s;
    if (s > maxStreak) maxStreak = s;
  }
  const avgStreak = allRelationships.length > 0 ? totalStreak / allRelationships.length : 0;
  const activeStreaks = allRelationships.filter((r) => r.streakDays > 0).length;

  const top10 = [...allRelationships]
    .sort((a, b) => b.streakDays - a.streakDays)
    .slice(0, 10)
    .map((r) => ({
      userId: r.user.id,
      name: r.user.displayName ?? r.user.email,
      characterName: r.character.name,
      streak: r.streakDays,
    }));

  // デイリーイベント
  const todayEvents = await prisma.userDailyEvent.groupBy({
    by: ['eventType'],
    where: { date: todayStr },
    _count: true,
  });

  const past7DayEvents = await prisma.userDailyEvent.groupBy({
    by: ['date', 'eventType'],
    where: { date: { in: past7Days } },
    _count: true,
    orderBy: { date: 'asc' },
  });

  const superRareUsers = await prisma.userDailyEvent.findMany({
    where: { eventType: 'super_rare' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { displayName: true, email: true } } },
  });

  // クリフハンガー
  const pendingCliffhangerCount = allRelationships.filter(
    (r) => r.pendingCliffhanger !== null
  ).length;

  const cliffhangerByChar: Record<string, number> = {};
  for (const r of allRelationships) {
    if (r.pendingCliffhanger !== null) {
      cliffhangerByChar[r.character.name] = (cliffhangerByChar[r.character.name] ?? 0) + 1;
    }
  }

  // Farewell
  const farewellMessages = await prisma.message.findMany({
    where: {
      metadata: {
        path: ['type'],
        equals: 'farewell',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      conversation: {
        include: {
          relationship: {
            include: {
              user: { select: { displayName: true, email: true } },
              character: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const farewellByHour: Record<number, number> = {};
  for (const m of farewellMessages) {
    const h = m.createdAt.getHours();
    farewellByHour[h] = (farewellByHour[h] ?? 0) + 1;
  }

  // ガチャ
  const activeBanners = await prisma.gachaBanner.findMany({
    where: { isActive: true },
    orderBy: { startAt: 'asc' },
  });

  const totalUserCards = await prisma.userCard.count();

  const cardsByRarity = await prisma.gachaCard.groupBy({
    by: ['rarity'],
    _count: true,
  });

  // 嫉妬メカニクス
  const allLevels = await prisma.relationship.findMany({ select: { level: true } });
  const levelValues = allLevels.map((r) => r.level);
  const avgLevel = levelValues.length > 0 ? levelValues.reduce((a, b) => a + b, 0) / levelValues.length : 0;
  const sorted = [...levelValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianLevel =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  const belowAvg = levelValues.filter((l) => l < avgLevel).length;
  const aboveAvg = levelValues.filter((l) => l >= avgLevel).length;

  return NextResponse.json({
    streak: {
      distribution: streakDist,
      activeStreaks,
      maxStreak,
      avgStreak: Math.round(avgStreak * 10) / 10,
      top10,
    },
    dailyEvents: {
      today: todayEvents.map((e) => ({ type: e.eventType, count: e._count })),
      past7Days: past7DayEvents.map((e) => ({ date: e.date, type: e.eventType, count: e._count })),
      recentSuperRare: superRareUsers.map((e) => ({
        name: e.user.displayName ?? e.user.email,
        date: e.date,
        createdAt: e.createdAt,
      })),
    },
    cliffhanger: {
      pendingCount: pendingCliffhangerCount,
      consumed24h: 0,
      byCharacter: cliffhangerByChar,
    },
    farewell: {
      recent: farewellMessages.map((m) => ({
        id: m.id,
        createdAt: m.createdAt,
        userName:
          m.conversation.relationship?.user.displayName ??
          m.conversation.relationship?.user.email,
        characterName: m.conversation.relationship?.character.name,
        content: m.content.slice(0, 80),
      })),
      byHour: farewellByHour,
    },
    gacha: {
      activeBanners,
      totalPulls: totalUserCards,
      cardsByRarity: cardsByRarity.map((r) => ({ rarity: r.rarity, count: r._count })),
    },
    jealousy: {
      avgLevel: Math.round(avgLevel * 10) / 10,
      medianLevel,
      belowAvg,
      aboveAvg,
    },
  });
}
