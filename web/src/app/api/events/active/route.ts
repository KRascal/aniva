import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/events/active — 現在アクティブなイベント一覧
 */
export async function GET() {
  try {
    const now = new Date();
    const scenarios = await prisma.limitedScenario.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        characterId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { startsAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      events: scenarios.map(s => ({
        ...s,
        daysRemaining: Math.max(0, Math.ceil((s.endsAt.getTime() - now.getTime()) / 86400000)),
      })),
    });
  } catch (error) {
    logger.error('[Events] Active events error', { error });
    return NextResponse.json({ events: [] });
  }
}
