/**
 * GET /api/characters/[slug]/relationships
 * キャラクターの関係性マップを返す
 *
 * response: {
 *   relations: Array<{
 *     targetCharacterId: string;
 *     targetName: string;
 *     targetAvatarUrl: string | null;
 *     relationLabel: string;
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // slugまたはidでキャラクターを検索
  const character = await prisma.character.findFirst({
    where: {
      OR: [
        { slug },
        { id: slug },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!character) {
    return NextResponse.json({ relations: [] });
  }

  // CharacterRelationshipGraph からこのキャラの関係性を取得
  const graphs = await prisma.characterRelationshipGraph.findMany({
    where: { characterId: character.id },
    select: {
      relatedName: true,
      relationshipType: true,
      description: true,
    },
    take: 20,
  });

  if (graphs.length === 0) {
    return NextResponse.json({ relations: [] });
  }

  // 関連キャラ名でキャラクター情報を引く（アバター取得）
  const relatedNames = graphs.map(g => g.relatedName);
  const relatedChars = await prisma.character.findMany({
    where: {
      name: { in: relatedNames },
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  const charByName = new Map(relatedChars.map(c => [c.name, c]));

  const relations = graphs.map(g => {
    const found = charByName.get(g.relatedName);
    return {
      targetCharacterId: found?.id ?? g.relatedName,
      targetName: g.relatedName,
      targetAvatarUrl: found?.avatarUrl ?? null,
      relationLabel: g.relationshipType,
    };
  });

  return NextResponse.json({ relations });
}
