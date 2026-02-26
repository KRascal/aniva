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

    console.log('[select-character] userId:', userId);

    // Verify user exists in DB — auto-create if missing (JWT strategy can skip adapter)
    let userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!userExists) {
      console.warn('[select-character] User not found in DB, auto-creating:', userId);
      const email = (session?.user as any)?.email as string | undefined;
      const name = (session?.user as any)?.name as string | undefined;
      // Check if user exists by email (prevent duplicates)
      if (email) {
        const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (byEmail) {
          // Email already exists with different ID — use that user
          // Note: JWT has wrong ID, but we proceed with the correct DB user
          console.warn('[select-character] Found existing user by email, using:', byEmail.id);
          userExists = byEmail as any;
        }
      }
      if (!userExists) {
        try {
          userExists = await prisma.user.create({
            data: {
              id: userId,
              email: email ?? `user-${userId}@aniva.local`,
              displayName: name || email?.split('@')[0] || 'User',
              emailVerified: new Date(),
            },
          }) as any;
          console.log('[select-character] Auto-created user:', userId);
        } catch (e) {
          console.error('[select-character] Failed to auto-create user:', e);
          return NextResponse.json(
            { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザー作成に失敗しました。再ログインしてください。' } },
            { status: 404 },
          );
        }
      }
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

    // Use the correct DB user ID (may differ from JWT ID if found by email)
    const effectiveUserId = userExists!.id;

    // Relationship作成（既存の場合はupsert）
    const relationship = await prisma.relationship.upsert({
      where: { userId_characterId: { userId: effectiveUserId, characterId } },
      create: {
        userId: effectiveUserId,
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
      where: { id: effectiveUserId },
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
