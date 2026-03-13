import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

const MAX_MESSAGES = 100;

interface ConversationMetadata {
  characterIds?: string[];
  characterNames?: string[];
  characterSlugs?: string[];
}

/**
 * GET /api/chat/group/[conversationId]
 * グループチャット履歴取得（再入室用）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Conversation取得 + オーナーチェック
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId || conversation.type !== 'group') {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // metadataからキャラ情報取得
    const metadata = conversation.metadata as ConversationMetadata | null;
    const characterIds = metadata?.characterIds ?? [];

    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });

    // リクエスト順を保持
    const orderedCharacters = characterIds
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null);

    // メッセージ取得（古い順、最大100件）
    const totalCount = await prisma.message.count({
      where: { conversationId },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: MAX_MESSAGES,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        characters: orderedCharacters.map(c => ({
          id: c.id,
          name: c.name,
          avatarUrl: c.avatarUrl,
        })),
        createdAt: conversation.createdAt,
      },
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
      hasMore: totalCount > MAX_MESSAGES,
    });
  } catch (error) {
    logger.error('[GroupChat/History] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
