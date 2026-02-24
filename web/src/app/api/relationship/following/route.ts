import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/relationship/following
 * フォロー中のキャラクター一覧を返す
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const relationships = await prisma.relationship.findMany({
    where: { userId, isFollowing: true },
    select: {
      characterId: true,
      isFanclub: true,
      character: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          slug: true,
          franchise: true,
          avatarUrl: true,
          coverUrl: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  type FollowingRow = {
    characterId: string;
    isFanclub: boolean;
    character: {
      id: string;
      name: string;
      nameEn: string | null;
      slug: string;
      franchise: string;
      avatarUrl: string | null;
      coverUrl: string | null;
    };
  };
  return NextResponse.json({
    following: (relationships as FollowingRow[]).map((r) => ({
      ...r.character,
      isFanclub: r.isFanclub,
    })),
  });
}
