/**
 * POST /api/scenarios/[id]/read
 * シナリオを既読にして内容を返す
 * 期間外の場合は403
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const now = new Date();

  try {
    const scenario = await prisma.limitedScenario.findUnique({
      where: { id },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            franchise: true,
          },
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 期間外チェック
    if (scenario.endsAt < now || scenario.startsAt > now) {
      return NextResponse.json(
        { error: 'このストーリーは消えてしまいました…' },
        { status: 403 }
      );
    }

    // 既読レコード upsert
    await prisma.limitedScenarioRead.upsert({
      where: {
        userId_scenarioId: {
          userId: session.user.id,
          scenarioId: id,
        },
      },
      create: {
        userId: session.user.id,
        scenarioId: id,
      },
      update: {},
    });

    const remainingMs = scenario.endsAt.getTime() - now.getTime();
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        characterId: scenario.characterId,
        title: scenario.title,
        description: scenario.description,
        content: scenario.content,
        startsAt: scenario.startsAt.toISOString(),
        endsAt: scenario.endsAt.toISOString(),
        isExpired: false,
        isRead: true,
        remainingHours,
        character: scenario.character,
      },
    });
  } catch (err) {
    logger.error('[scenarios/read]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
