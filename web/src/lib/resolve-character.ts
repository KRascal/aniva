import { prisma } from './prisma';

/**
 * characterId が slug でも実ID でも正しいDB IDに解決するヘルパー
 * UUID形式・カスタムID形式の両方に対応
 */
export async function resolveCharacterId(characterIdOrSlug: string): Promise<string | null> {
  // findFirst を使用（findUnique は Prisma 7 でUUID形式バリデーションが発生する場合がある）
  // まずIDとして検索
  const byId = await prisma.character.findFirst({
    where: { id: characterIdOrSlug },
    select: { id: true },
  });
  if (byId) return byId.id;

  // 見つからなければslugとして検索
  const bySlug = await prisma.character.findFirst({
    where: { slug: characterIdOrSlug },
    select: { id: true },
  });
  return bySlug?.id ?? null;
}
