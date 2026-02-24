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
      isFollowing: true,
      isFanclub: true,
      character: {
        select: { name: true, slug: true, avatarUrl: true },
      },
      conversations: {
        take: 1,
        orderBy: { updatedAt: 'desc' },
        select: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, role: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  type RelationshipRow = {
    characterId: string;
    level: number;
    experiencePoints: number;
    totalMessages: number;
    lastMessageAt: Date | null;
    isFollowing: boolean;
    isFanclub: boolean;
    character: { name: string; slug: string; avatarUrl: string | null };
    conversations: { messages: { content: string; role: string; createdAt: Date }[] }[];
  };
  const result = (relationships as RelationshipRow[]).map((r) => {
    const levelInfo = RELATIONSHIP_LEVELS[Math.min(r.level - 1, RELATIONSHIP_LEVELS.length - 1)];
    const lastMsg = r.conversations?.[0]?.messages?.[0] ?? null;
    return {
      characterId: r.characterId,
      level: r.level,
      levelName: levelInfo?.name ?? '出会い',
      xp: r.experiencePoints,
      totalMessages: r.totalMessages,
      lastMessageAt: r.lastMessageAt,
      isFollowing: r.isFollowing,
      isFanclub: r.isFanclub,
      character: r.character,
      lastMessage: lastMsg ? { content: lastMsg.content, role: lastMsg.role } : null,
    };
  });

  return NextResponse.json({ relationships: result });
}
