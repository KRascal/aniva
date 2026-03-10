import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';

/**
 * POST /api/relationship/[characterId]/follow
 * フォロー/アンフォローを切り替える
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    // キャラクター存在確認
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // ユーザー存在確認（JWTのIDがDB上に存在しない場合のガード）
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please re-login.' }, { status: 404 });
    }

    // Relationship を upsert してフォロー状態をトグル
    const existing = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
    });

    const newFollowing = !(existing?.isFollowing ?? false);

    const relationship = await prisma.relationship.upsert({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      create: {
        userId,
        characterId,
        locale: 'ja',
        isFollowing: true,
      },
      update: {
        isFollowing: newFollowing,
      },
    });

    const followerCount = await prisma.relationship.count({
      where: { characterId, isFollowing: true },
    });

    return NextResponse.json({
      isFollowing: relationship.isFollowing,
      characterId,
      followerCount,
    });
  } catch (error) {
    console.error('[relationship/follow POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/relationship/[characterId]/follow
 * フォロー状態を取得する
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ isFollowing: false, isFanclub: false });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { isFollowing: true, isFanclub: true },
    });

    const followerCount = await prisma.relationship.count({
      where: { characterId, isFollowing: true },
    });

    return NextResponse.json({
      isFollowing: relationship?.isFollowing ?? false,
      isFanclub: relationship?.isFanclub ?? false,
      followerCount,
    });
  } catch (error) {
    console.error('[relationship/follow GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
