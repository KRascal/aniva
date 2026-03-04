import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 },
      );
    }

    // JWTのIDでユーザーが見つからない場合、emailで検索
    let effectiveUserId = userId;
    const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!existingUser) {
      const email = session?.user?.email;
      if (email) {
        const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (byEmail) effectiveUserId = byEmail.id;
      }
    }

    const body = await req.json();
    const { notificationPermission } = body as { notificationPermission: boolean | null };

    // ニックネームが設定されている場合、displayNameも同期
    const preUser = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { nickname: true, displayName: true },
    });

    const updatedUser = await prisma.user.update({
      where: { id: effectiveUserId },
      data: {
        onboardingStep: 'completed',
        onboardingCompletedAt: new Date(),
        notificationPermission: notificationPermission ?? null,
        // nicknameが設定済みかつdisplayNameがメアド由来なら同期
        ...(preUser?.nickname && preUser.displayName?.includes('@') || preUser?.displayName?.includes('+')
          ? { displayName: preUser.nickname }
          : {}),
      },
    });

    // オンボーディングキャラを自動フォロー
    if (updatedUser.onboardingCharacterId) {
      await prisma.relationship.upsert({
        where: {
          userId_characterId_locale: {
            userId: effectiveUserId,
            characterId: updatedUser.onboardingCharacterId,
            locale: 'ja',
          },
        },
        create: {
          userId: effectiveUserId,
          characterId: updatedUser.onboardingCharacterId,
          isFollowing: true,
        },
        update: {
          isFollowing: true,
        },
      });
    }

    // ディープリンク経由: /chat/{characterId}へ（/c/{slug}はゲストフローで再表示されてしまう）
    const redirectTo = updatedUser.onboardingCharacterId
      ? `/chat/${updatedUser.onboardingCharacterId}`
      : '/explore';

    return NextResponse.json({
      success: true,
      data: { redirectTo },
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
