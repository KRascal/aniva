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

  // IDまたはslugで検索（$queryRawUnsafe + パラメータバインドでPrismaバリデーション回避）
  // Prisma 7 + PrismaPg adapter の findUnique/findFirst はカスタムID形式で検索失敗するため
  type RawChar = { id: string; name: string; nameEn: string | null; slug: string; franchise: string; franchiseEn: string | null; description: string | null; avatarUrl: string | null; coverUrl: string | null; catchphrases: string[]; personalityTraits: string[]; fcMonthlyPriceJpy: number | null; fcMonthlyCoins: number | null; fcIncludedCallMin: number | null; fcOverageCallCoinPerMin: number | null; voiceModelId: string | null };

  const sql = 'SELECT id, name, "nameEn", slug, franchise, "franchiseEn", description, "avatarUrl", "coverUrl", catchphrases, "personalityTraits", "fcMonthlyPriceJpy", "fcMonthlyCoins", "fcIncludedCallMin", "fcOverageCallCoinPerMin", "voiceModelId" FROM "Character" WHERE id = $1 OR slug = $1 LIMIT 1';
  const rows = await prisma.$queryRawUnsafe<RawChar[]>(sql, id);
  let character: RawChar | null = rows[0] ?? null;

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
