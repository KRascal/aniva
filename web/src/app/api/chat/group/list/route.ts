import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

interface ConversationMetadata {
  characterIds?: string[];
  characterNames?: string[];
  characterSlugs?: string[];
}

/**
 * GET /api/chat/group/list
 * グループチャット一覧
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのグループチャット一覧（updatedAt降順）
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        type: 'group',
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            role: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    // キャラ情報を一括取得
    const allCharacterIds = new Set<string>();
    for (const conv of conversations) {
      const metadata = conv.metadata as ConversationMetadata | null;
      if (metadata?.characterIds) {
        metadata.characterIds.forEach(id => allCharacterIds.add(id));
      }
    }

    const characters = await prisma.character.findMany({
      where: { id: { in: Array.from(allCharacterIds) } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });
    const charMap = new Map(characters.map(c => [c.id, c]));

    // 同じキャラ組み合わせの会話を統合（最新のみ表示）
    const seenCombinations = new Map<string, boolean>();
    const deduped = conversations.filter(conv => {
      const metadata = conv.metadata as ConversationMetadata | null;
      const charIds = metadata?.characterIds ?? [];
      // キャラIDをソートしてキーにする（順番違いも同一とみなす）
      const key = [...charIds].sort().join(',');
      if (seenCombinations.has(key)) return false;
      seenCombinations.set(key, true);
      return true;
    });

    return NextResponse.json({
      conversations: deduped.map(conv => {
        const metadata = conv.metadata as ConversationMetadata | null;
        const charIds = metadata?.characterIds ?? [];
        const lastMsg = conv.messages[0] ?? null;

        return {
          id: conv.id,
          characters: charIds
            .map(id => charMap.get(id))
            .filter((c): c is NonNullable<typeof c> => c != null)
            .map(c => ({
              id: c.id,
              name: c.name,
              avatarUrl: c.avatarUrl,
            })),
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                role: lastMsg.role,
                metadata: lastMsg.metadata,
                createdAt: lastMsg.createdAt,
              }
            : null,
          updatedAt: conv.updatedAt,
          isPinned: !!(metadata as Record<string, unknown>)?.isPinned,
          pinnedAt: ((metadata as Record<string, unknown>)?.pinnedAt as string | null) ?? null,
        };
      }),
    });
  } catch (error) {
    logger.error('[GroupChat/List] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
