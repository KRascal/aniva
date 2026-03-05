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

  // まずIDで検索（$queryRaw でPrismaのバリデーションをバイパス）
  type RawChar = { id: string; name: string; nameEn: string | null; slug: string; franchise: string; franchiseEn: string | null; description: string | null; avatarUrl: string | null; coverUrl: string | null; catchphrases: string[]; personalityTraits: string[]; fcMonthlyPriceJpy: number | null; fcMonthlyCoins: number | null; fcIncludedCallMin: number | null; fcOverageCallCoinPerMin: number | null; voiceModelId: string | null };
  const byIdRaw = await prisma.$queryRaw<RawChar[]>`
    SELECT id, name, "nameEn", slug, franchise, "franchiseEn", description, "avatarUrl", "coverUrl",
           catchphrases, "personalityTraits", "fcMonthlyPriceJpy", "fcMonthlyCoins",
           "fcIncludedCallMin", "fcOverageCallCoinPerMin", "voiceModelId"
    FROM "Character" WHERE id = ${id} LIMIT 1
  `;
  let character: RawChar | null = byIdRaw[0] ?? null;

  if (!character) {
    // slugで検索
    const bySlugRaw = await prisma.$queryRaw<RawChar[]>`
      SELECT id, name, "nameEn", slug, franchise, "franchiseEn", description, "avatarUrl", "coverUrl",
             catchphrases, "personalityTraits", "fcMonthlyPriceJpy", "fcMonthlyCoins",
             "fcIncludedCallMin", "fcOverageCallCoinPerMin", "voiceModelId"
      FROM "Character" WHERE slug = ${id} LIMIT 1
    `;
    character = bySlugRaw[0] ?? null;
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
