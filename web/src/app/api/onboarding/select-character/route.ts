import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_GREETINGS = ['…ねぇ', '…やっと来たね', '…気がついた？'];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { characterId } = body;

    if (!characterId || typeof characterId !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'characterIdは必須です' } },
        { status: 422 },
      );
    }

    // キャラクター存在確認
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        onboardingGreetings: true,
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'キャラクターが見つかりません' } },
        { status: 404 },
      );
    }

    // Relationship作成（既存の場合はupsert）
    const relationship = await prisma.relationship.upsert({
      where: { userId_characterId: { userId, characterId } },
      create: {
        userId,
        characterId,
        isFollowing: true,
      },
      update: {
        isFollowing: true,
      },
    });

    // ランダム挨拶パターン選択
    const greetings = (character.onboardingGreetings as string[] | null) ?? [];
    const effectiveGreetings = greetings.length > 0 ? greetings : DEFAULT_GREETINGS;
    const randomIndex = Math.floor(Math.random() * effectiveGreetings.length);
    const greeting = effectiveGreetings[randomIndex];

    // ユーザーステップ更新
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: 'first_chat',
        onboardingCharacterId: characterId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        character: {
          id: character.id,
          name: character.name,
          slug: character.slug,
          avatarUrl: character.avatarUrl,
          greeting,
        },
        relationshipId: relationship.id,
      },
    });
  } catch (error) {
    console.error('Onboarding select-character error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
