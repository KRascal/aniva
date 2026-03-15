import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    const now = new Date();
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1; // 1-indexed

    // Month range
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

    // Overlap filter: event starts before end of month AND ends after start of month
    const overlapFilter = {
      startsAt: { lte: end },
      endsAt: { gte: start },
    };

    const bannerOverlapFilter = {
      startAt: { lte: end },
      endAt: { gte: start },
    };

    const [scenarios, banners, chapters] = await Promise.all([
      prisma.limitedScenario.findMany({
        where: overlapFilter,
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          isActive: true,
          character: { select: { id: true, name: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.gachaBanner.findMany({
        where: bannerOverlapFilter,
        select: {
          id: true,
          name: true,
          startAt: true,
          endAt: true,
          isActive: true,
          themeColor: true,
          characterId: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      // Story chapters with scheduledAt or createdAt within month (treat createdAt as "publication date")
      prisma.storyChapter.findMany({
        where: {
          isActive: true,
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          title: true,
          chapterNumber: true,
          createdAt: true,
          character: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
    ]);

    return NextResponse.json({
      year,
      month,
      scenarios: scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        isActive: s.isActive,
        character: s.character,
        type: 'scenario' as const,
      })),
      banners: banners.map((b) => ({
        id: b.id,
        name: b.name,
        startAt: b.startAt,
        endAt: b.endAt,
        isActive: b.isActive,
        themeColor: b.themeColor,
        characterId: b.characterId,
        type: 'gacha' as const,
      })),
      stories: chapters.map((c) => ({
        id: c.id,
        title: c.title,
        chapterNumber: c.chapterNumber,
        date: c.createdAt,
        character: c.character,
        type: 'story' as const,
      })),
    });
  } catch (error) {
    logger.error('[admin/calendar] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
