import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        nickname: true,
        avatarUrl: true,
        coverImageUrl: true,
        bio: true,
        profilePublic: true,
        plan: true,
        relationships: {
          where: { isFollowing: true },
          select: {
            level: true,
            isFanclub: true,
            character: {
              select: {
                id: true,
                name: true,
                slug: true,
                franchise: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.profilePublic) {
      // Return minimal info when profile is private
      return NextResponse.json({
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        profilePublic: false,
      });
    }

    return NextResponse.json({
      id: user.id,
      displayName: user.displayName,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      profilePublic: user.profilePublic,
      plan: user.plan,
      following: user.relationships.map((rel: { character: { id: string; name: string; slug: string | null; franchise: string; avatarUrl: string | null }; level: number; isFanclub: boolean }) => ({
        characterId: rel.character.id,
        characterName: rel.character.name,
        characterSlug: rel.character.slug,
        characterFranchise: rel.character.franchise,
        characterAvatarUrl: rel.character.avatarUrl,
        level: rel.level,
        isFanclub: rel.isFanclub,
      })),
    });
  } catch (error) {
    console.error('[users/[userId]/profile] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
