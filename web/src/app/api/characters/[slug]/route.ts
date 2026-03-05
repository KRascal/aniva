import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const character = await prisma.character.findUnique({
    where: { slug },
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

  const { voiceModelId, ...characterPublic } = character;
  return NextResponse.json({
    character: {
      ...characterPublic,
      hasVoice: !!(voiceModelId && voiceModelId.trim() !== ''),
    },
  });
}
