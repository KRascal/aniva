import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    // Get character name
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true },
    });

    // Find conversation
    const conversation = await prisma.conversation.findFirst({
      where: { relationship: { userId, characterId } },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json({ images: [], characterName: character?.name ?? '' });
    }

    // Get all messages with images
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        imageUrl: { not: null },
      },
      select: {
        id: true,
        imageUrl: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const images = messages
      .filter((m) => m.imageUrl)
      .map((m) => ({
        id: m.id,
        imageUrl: m.imageUrl!,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      }));

    return NextResponse.json({
      images,
      characterName: character?.name ?? '',
    });
  } catch (error) {
    logger.error('[album API] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
