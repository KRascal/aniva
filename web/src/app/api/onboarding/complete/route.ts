import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const { notificationPermission } = body as { notificationPermission: boolean | null };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: 'completed',
        onboardingCompletedAt: new Date(),
        notificationPermission: notificationPermission ?? null,
      },
    });

    const redirectTo = updatedUser.onboardingDeeplinkSlug
      ? `/c/${updatedUser.onboardingDeeplinkSlug}`
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
