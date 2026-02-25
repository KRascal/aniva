import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CharacterDeeplinkPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  // 未ログイン → /signup?redirect=/c/{slug} にリダイレクト
  if (!session?.user) {
    redirect(`/signup?redirect=/c/${slug}`);
  }

  const userId = (session.user as any).id as string;
  const onboardingStep = (session.user as any).onboardingStep as string | null | undefined;

  // キャラクターをslugで検索
  const character = await prisma.character.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!character) {
    // キャラクターが見つからない場合は/exploreへ
    redirect('/explore');
  }

  // オンボーディング未完了 → slugとcharacterIdを保存してオンボーディングへ
  if (onboardingStep !== 'completed') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingDeeplinkSlug: slug,
        onboardingCharacterId: character.id,
      },
    });
    redirect('/onboarding');
  }

  // オンボーディング完了済み → /profile/{characterId} へリダイレクト
  redirect(`/profile/${character.id}`);
}
