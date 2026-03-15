import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string; relId: string }> };

/**
 * PUT /api/admin/characters/:id/relationships/:relId
 * 関係性を更新
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { relId } = await params;

  try {
    const body = await req.json();
    const { relationshipType, description, keyEpisodes, emotionalBond } = body;

    const relationship = await prisma.characterRelationshipGraph.update({
      where: { id: relId },
      data: {
        ...(relationshipType && { relationshipType }),
        ...(description !== undefined && { description }),
        ...(keyEpisodes !== undefined && { keyEpisodes }),
        ...(emotionalBond !== undefined && { emotionalBond }),
      },
    });

    return NextResponse.json({ relationship });
  } catch (error) {
    logger.error('[relationships] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/characters/:id/relationships/:relId
 * 関係性を削除
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { relId } = await params;

  try {
    await prisma.characterRelationshipGraph.delete({
      where: { id: relId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[relationships] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
