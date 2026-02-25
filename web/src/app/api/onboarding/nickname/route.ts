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
    const { nickname } = body;

    // バリデーション
    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ニックネームを入力してください' } },
        { status: 422 },
      );
    }

    const trimmed = nickname.trim();

    if (trimmed.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ニックネームを入力してください' } },
        { status: 422 },
      );
    }

    if (trimmed.length > 20) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'ニックネームは20文字以内で入力してください' } },
        { status: 422 },
      );
    }

    // XSS対策: 禁止文字チェック
    if (/[<>&"]/.test(trimmed)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: '使用できない文字が含まれています' } },
        { status: 422 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user?.onboardingStep === 'completed') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_COMPLETED', message: 'オンボーディング完了済みです' } },
        { status: 400 },
      );
    }

    // ディープリンク由来かどうかで次ステップを判定
    const isDeepLink = !!user?.onboardingDeeplinkSlug;
    const nextStep = isDeepLink ? 'first_chat' : 'character_select';

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        nickname: trimmed,
        onboardingStep: nextStep,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        nickname: updated.nickname,
        nextStep,
        characterId: isDeepLink ? user?.onboardingCharacterId : undefined,
      },
    });
  } catch (error) {
    console.error('Onboarding nickname error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
