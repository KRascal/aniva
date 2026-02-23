import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { auth } from '@/lib/auth';

/**
 * GET /api/relationship/all
 * 現在のユーザーの全キャラクターとの関係性データを返す
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const relationships = await prisma.relationship.findMany({
    where: { userId },
    select: {
      characterId: true,
      level: true,
      experiencePoints: true,
      totalMessages: true,
      lastMessageAt: true,
      character: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  const result = relationships.map((r) => {
    const levelInfo = RELATIONSHIP_LEVELS[Math.min(r.level - 1, RELATIONSHIP_LEVELS.length - 1)];
    return {
      characterId: r.characterId,
      level: r.level,
      levelName: levelInfo?.name ?? '出会い',
      xp: r.experiencePoints,
      totalMessages: r.totalMessages,
      lastMessageAt: r.lastMessageAt,
      character: r.character,
    };
  });

  return NextResponse.json({ relationships: result });
}
