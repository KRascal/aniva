import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';
import { getAllConversationIds } from '@/lib/conversation';
import { logger } from '@/lib/logger';

/**
 * GET /api/chat/history-by-user?characterId=...&limit=50
 * Loads chat history for the authenticated user + character pair.
 * 全conversationを横断してメッセージを取得（conversation分散問題対策）。
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

    // 全conversationからメッセージを横断取得
    const conversationIds = await getAllConversationIds(relationship.id);

    if (conversationIds.length === 0) {
      return NextResponse.json({
        messages: [],
        hasMore: false,
        relationship: { id: relationship.id, level: relationship.level, xp: relationship.experiencePoints },
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
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
