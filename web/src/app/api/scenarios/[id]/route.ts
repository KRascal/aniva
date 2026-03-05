/**
 * GET /api/scenarios/[id]
 * シナリオ詳細（未読時はcontentなし、既読時はcontent返す）
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
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
        readers: {
          where: { userId: session.user.id },
          select: { readAt: true },
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isExpired = scenario.endsAt < now;
    const isRead = scenario.readers.length > 0;
    const remainingMs = scenario.endsAt.getTime() - now.getTime();
    const remainingHours = isExpired ? 0 : Math.ceil(remainingMs / (1000 * 60 * 60));

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        characterId: scenario.characterId,
        title: isExpired ? '幻のストーリー' : scenario.title,
        description: isExpired ? null : (scenario.description ?? null),
        // 既読or期限内のみcontent返す（期限切れ未読は空）
        content: isRead ? scenario.content : (isExpired ? '' : null),
        startsAt: scenario.startsAt.toISOString(),
        endsAt: scenario.endsAt.toISOString(),
        isExpired,
        isRead,
        remainingHours,
        character: scenario.character,
      },
    });
  } catch (err) {
    console.error('[scenarios/get]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
