import { prisma } from './prisma';

/**
 * characterId が slug でも実ID でも正しいDB IDに解決するヘルパー
 * Prisma 7 + PrismaPg adapter の findUnique/findFirst はカスタムID形式で失敗するため
 * $queryRawUnsafe を使用してバリデーションを回避
 */
export async function resolveCharacterId(characterIdOrSlug: string): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "Character" WHERE id = $1 OR slug = $1 LIMIT 1',
    characterIdOrSlug
  );
  return rows[0]?.id ?? null;
}
