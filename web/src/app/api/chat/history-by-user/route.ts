import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/chat/history-by-user?userId=...&characterId=...&limit=50
 * Loads chat history for a user+character pair without needing the relationshipId.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const characterId = url.searchParams.get('characterId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before');

    if (!userId || !characterId) {
      return NextResponse.json({ error: 'userId and characterId are required' }, { status: 400 });
    }

    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
      select: { id: true, level: true, experiencePoints: true },
    });

    if (!relationship) {
      return NextResponse.json({ messages: [], hasMore: false, relationship: null });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      return NextResponse.json({
        messages: [],
        hasMore: false,
        relationship: { id: relationship.id, level: relationship.level, xp: relationship.experiencePoints },
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const result = messages.slice(0, limit).reverse();

    return NextResponse.json({
      messages: result,
      hasMore,
      relationship: { id: relationship.id, level: relationship.level, xp: relationship.experiencePoints },
    });
  } catch (error) {
    console.error('Chat history-by-user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
