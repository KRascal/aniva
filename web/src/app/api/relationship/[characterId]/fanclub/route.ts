import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * POST /api/relationship/[characterId]/fanclub
 * ファンクラブ加入/脱退を切り替える
 * DEMO_MODE=true の場合は課金チェックをスキップ
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

  const currentlyFanclub = existing?.isFanclub ?? false;

  // 加入しようとしている場合（現在未加入）→ 課金チェック
  if (!currentlyFanclub && character.monthlyPrice > 0) {
    const isDemo = process.env.DEMO_MODE === 'true';
    if (!isDemo) {
      // 本番: Stripe未連携のため課金必須メッセージを返す
      return NextResponse.json({
        requiresPayment: true,
        monthlyPrice: character.monthlyPrice,
        characterName: character.name,
      }, { status: 402 });
    }
    // DEMO_MODE=true の場合はスキップして無料で加入OK
  }

  const newFanclub = !currentlyFanclub;

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
