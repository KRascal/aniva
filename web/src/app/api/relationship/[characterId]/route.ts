import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RELATIONSHIP_LEVELS } from '@/types/character';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const relationship = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
    include: { character: { select: { name: true, slug: true } } },
  });

  if (!relationship) {
    return NextResponse.json({
      level: 1,
      levelName: RELATIONSHIP_LEVELS[0].name,
      xp: 0,
      nextLevelXp: RELATIONSHIP_LEVELS[1].xpRequired,
      totalMessages: 0,
    });
  }

  const currentLevel = RELATIONSHIP_LEVELS[relationship.level - 1];
  const nextLevel = RELATIONSHIP_LEVELS[relationship.level] || null;

  return NextResponse.json({
    level: relationship.level,
    levelName: currentLevel.name,
    xp: relationship.experiencePoints,
    nextLevelXp: nextLevel?.xpRequired || null,
    totalMessages: relationship.totalMessages,
    firstMessageAt: relationship.firstMessageAt,
    lastMessageAt: relationship.lastMessageAt,
    character: relationship.character,
  });
}
