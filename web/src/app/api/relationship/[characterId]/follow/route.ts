import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/relationship/[characterId]/follow
 * フォロー/アンフォローを切り替える
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;

  // キャラクター存在確認
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  // Relationship を upsert してフォロー状態をトグル
  const existing = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
  });

  const newFollowing = !(existing?.isFollowing ?? false);

  const relationship = await prisma.relationship.upsert({
    where: { userId_characterId: { userId, characterId } },
    create: {
      userId,
      characterId,
      isFollowing: true,
    },
    update: {
      isFollowing: newFollowing,
    },
  });

  return NextResponse.json({
    isFollowing: relationship.isFollowing,
    characterId,
  });
}

/**
 * GET /api/relationship/[characterId]/follow
 * フォロー状態を取得する
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ isFollowing: false, isFanclub: false });
  }

  const { characterId } = await params;

  const relationship = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
    select: { isFollowing: true, isFanclub: true },
  });

  return NextResponse.json({
    isFollowing: relationship?.isFollowing ?? false,
    isFanclub: relationship?.isFanclub ?? false,
  });
}
