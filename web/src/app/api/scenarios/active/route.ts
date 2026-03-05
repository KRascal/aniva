/**
 * GET /api/scenarios/active
 * 現在アクティブな期間限定シナリオ一覧 + 終了済み（幻のストーリー）
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  try {
    // アクティブ（期間内）+ 終了から24h以内（幻のストーリーとして表示）
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const scenarios = await prisma.limitedScenario.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: cutoff },
      },
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
      orderBy: { endsAt: 'asc' },
    });

    const result = scenarios.map((s) => {
      const isExpired = s.endsAt < now;
      const remainingMs = s.endsAt.getTime() - now.getTime();
      const remainingHours = isExpired ? 0 : Math.ceil(remainingMs / (1000 * 60 * 60));
      const isRead = s.readers.length > 0;

      return {
        id: s.id,
        characterId: s.characterId,
        title: isExpired ? '幻のストーリー' : s.title,
        description: isExpired ? null : (s.description ?? null),
        // 終了済みはcontent空
        content: isExpired ? '' : undefined,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        isExpired,
        isRead,
        remainingHours,
        character: s.character,
      };
    });

    return NextResponse.json({ scenarios: result });
  } catch {
    // DB migration pending
    return NextResponse.json({ scenarios: [] });
  }
}
