import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/relationship/[characterId]/fanclub
 * ファンクラブ加入/脱退を切り替える（デモ: 無料で加入可能）
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

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  const existing = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
  });

  const newFanclub = !(existing?.isFanclub ?? false);

  const relationship = await prisma.relationship.upsert({
    where: { userId_characterId: { userId, characterId } },
    create: {
      userId,
      characterId,
      isFanclub: true,
      isFollowing: true, // ファンクラブ加入時は自動フォロー
    },
    update: {
      isFanclub: newFanclub,
      // ファンクラブ加入時は自動フォロー
      ...(newFanclub ? { isFollowing: true } : {}),
    },
  });

  return NextResponse.json({
    isFanclub: relationship.isFanclub,
    isFollowing: relationship.isFollowing,
    characterId,
  });
}
