import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // JWTのIDでユーザーが見つからない場合、emailで検索
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        onboardingStep: true,
        onboardingCharacterId: true,
        onboardingDeeplinkSlug: true,
      },
    });
    if (!user) {
      const email = (session?.user as any)?.email as string | undefined;
      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            nickname: true,
            onboardingStep: true,
            onboardingCharacterId: true,
            onboardingDeeplinkSlug: true,
          },
        });
      }
    }
    if (!user) {
      return NextResponse.json({ success: true, data: { phase: 'welcome' } });
    }

    // キャラクター情報を取得
    let character = null;
    if (user.onboardingCharacterId) {
      character = await prisma.character.findUnique({
        where: { id: user.onboardingCharacterId },
        select: { id: true, name: true, slug: true, avatarUrl: true, franchise: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        phase: user.onboardingStep || 'welcome',
        nickname: user.nickname,
        character,
        deeplinkSlug: user.onboardingDeeplinkSlug,
      },
    });
  } catch (error) {
    console.error('Onboarding state error:', error);
    return NextResponse.json({ success: true, data: { phase: 'welcome' } });
  }
}
