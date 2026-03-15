import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/characters/:id/relationships
 * キャラクターの関係性グラフを取得
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: characterId } = await params;

  try {
    const relationships = await prisma.characterRelationshipGraph.findMany({
      where: { characterId },
      orderBy: { relatedName: 'asc' },
    });

    return NextResponse.json({ relationships });
  } catch (error) {
    logger.error('[relationships] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/characters/:id/relationships
 * 新しい関係性を追加
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: characterId } = await params;

  try {
    const body = await req.json();
    const { relatedName, relationshipType, description, keyEpisodes, emotionalBond } = body;

    if (!relatedName || typeof relatedName !== 'string') {
      return NextResponse.json({ error: 'relatedNameは必須です' }, { status: 400 });
    }
    if (!relationshipType || typeof relationshipType !== 'string') {
      return NextResponse.json({ error: 'relationshipTypeは必須です' }, { status: 400 });
    }

    // Verify character exists
    const char = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true },
    });
    if (!char) {
      return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
    }

    const relationship = await prisma.characterRelationshipGraph.upsert({
      where: { characterId_relatedName: { characterId, relatedName } },
      create: {
        characterId,
        relatedName,
        relationshipType,
        description: description ?? '',
        keyEpisodes: keyEpisodes ?? [],
        emotionalBond: emotionalBond ?? null,
      },
      update: {
        relationshipType,
        description: description ?? '',
        keyEpisodes: keyEpisodes ?? [],
        emotionalBond: emotionalBond ?? null,
      },
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    logger.error('[relationships] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
