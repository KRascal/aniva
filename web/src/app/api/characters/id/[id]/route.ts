import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // UUID形式ならidで検索、そうでなければslugとして検索
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const character = await prisma.character.findUnique({
    where: isUuid ? { id } : { slug: id },
    select: {
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
    },
  });

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
