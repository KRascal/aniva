import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';
import { logger } from '@/lib/logger';

/**
 * GET /api/chat/history-by-user?characterId=...&limit=50
 * Loads chat history for the authenticated user + character pair.
 */
export async function GET(req: NextRequest) {
  try {
    // 認証チェック（IDOR修正: userIdはセッションから取得）
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const rawCharacterId = url.searchParams.get('characterId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before');

    if (!rawCharacterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    // slug/カスタムID両対応
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
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
    logger.error('Chat history-by-user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
