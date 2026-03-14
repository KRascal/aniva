import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * slug/UUID両対応のキャラクターID解決（永久ルール）
 */
async function resolveCharacterId(idOrSlug: string): Promise<string | null> {
  // UUID形式ならそのまま返す
  if (idOrSlug.match(/^[0-9a-f-]{36}$/i)) return idOrSlug;
  // slugで検索
  const char = await prisma.character.findFirst({
    where: { slug: idOrSlug },
    select: { id: true },
  });
  return char?.id ?? null;
}

/**
 * GET /api/characters/[characterId]/relationships
 * キャラクターの関係性グラフを取得（slug/UUID両対応）
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawId } = await params;

  // slug/UUID両対応
  const characterId = await resolveCharacterId(rawId);
  if (!characterId) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  const relationships = await prisma.characterRelationshipGraph.findMany({
    where: { characterId },
    orderBy: { emotionalBond: 'desc' },
    select: {
      id: true,
      relatedName: true,
      relationshipType: true,
      description: true,
      keyEpisodes: true,
      emotionalBond: true,
    },
  });

  // relatedNameからANIVA登録済みキャラの情報を取得
  const enriched = await Promise.all(
    relationships.map(async (rel) => {
      const relatedChar = await prisma.character.findFirst({
        where: {
          OR: [
            { name: rel.relatedName },
            { slug: rel.relatedName.toLowerCase() },
          ],
        },
        select: { id: true, name: true, slug: true, avatarUrl: true },
      });
      return {
        ...rel,
        relatedCharacter: relatedChar ?? null,
      };
    }),
  );

  return NextResponse.json({ relationships: enriched });
}
