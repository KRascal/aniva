import { prisma } from './prisma';

/**
 * characterId が slug でも実ID でも正しいDB IDに解決するヘルパー
 * UUID形式・カスタムID形式の両方に対応
 */
export async function resolveCharacterId(characterIdOrSlug: string): Promise<string | null> {
  // まずIDとして検索
  const byId = await prisma.character.findUnique({
    where: { id: characterIdOrSlug },
    select: { id: true },
  });
  if (byId) return byId.id;

  // 見つからなければslugとして検索
  const bySlug = await prisma.character.findUnique({
    where: { slug: characterIdOrSlug },
    select: { id: true },
  });
  return bySlug?.id ?? null;
}
