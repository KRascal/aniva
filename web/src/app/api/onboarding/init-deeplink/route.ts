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
    const { slug, characterId } = body as { slug: string; characterId: string };

    if (!slug || !characterId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'slug と characterId は必須です' } },
        { status: 422 },
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingDeeplinkSlug: slug,
        onboardingCharacterId: characterId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding init-deeplink error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
