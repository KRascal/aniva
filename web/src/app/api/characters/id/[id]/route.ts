import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const selectFields = {
    id: true,
    name: true,
    nameEn: true,
    slug: true,
    franchise: true,
    franchiseEn: true,
    description: true,
    avatarUrl: true,
    coverUrl: true,
    catchphrases: true,
    personalityTraits: true,
    fcMonthlyPriceJpy: true,
    fcMonthlyCoins: true,
    fcIncludedCallMin: true,
    fcOverageCallCoinPerMin: true,
    voiceModelId: true,
  } as const;

  // findFirst を使用（findUnique は Prisma 7 で UUID形式バリデーションが発生する場合がある）
  // まずIDで検索、次にslugで検索
  let character = await prisma.character.findFirst({
    where: { id },
    select: selectFields,
  });

  if (!character) {
    character = await prisma.character.findFirst({
      where: { slug: id },
      select: selectFields,
    });
  }

  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  // voiceModelId は内部IDのためフロントには公開せず、hasVoice フラグのみ返す
  const { voiceModelId, ...characterPublic } = character;
  return NextResponse.json({
    character: {
      ...characterPublic,
      hasVoice: !!(voiceModelId && voiceModelId.trim() !== ''),
    },
  });
}
