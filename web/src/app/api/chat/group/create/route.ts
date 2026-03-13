import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const MAX_CHARACTERS = 3;

/**
 * POST /api/chat/group/create
 * 新規グループチャット作成
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { characterIds } = body as { characterIds: string[] };

    if (!Array.isArray(characterIds) || characterIds.length < 1) {
      return NextResponse.json({ error: 'characterIds must be a non-empty array' }, { status: 400 });
    }
    if (characterIds.length > MAX_CHARACTERS) {
      return NextResponse.json({ error: `Max ${MAX_CHARACTERS} characters allowed` }, { status: 400 });
    }

    // キャラクター情報取得
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });

    if (characters.length !== characterIds.length) {
      return NextResponse.json({ error: 'Some characters not found' }, { status: 404 });
    }

    // リクエスト順に並べる
    const orderedCharacters = characterIds
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null);

    // Conversation作成
    const conversation = await prisma.conversation.create({
      data: {
        type: 'group',
        userId,
        metadata: {
          characterIds: orderedCharacters.map(c => c.id),
          characterNames: orderedCharacters.map(c => c.name),
          characterSlugs: orderedCharacters.map(c => c.slug),
        } as Prisma.InputJsonValue,
      },
    });

    // 各キャラのRelationship取得 or 作成
    for (const character of orderedCharacters) {
      const existing = await prisma.relationship.findUnique({
        where: { userId_characterId_locale: { userId, characterId: character.id, locale: 'ja' } },
      });
      if (!existing) {
        await prisma.relationship.create({
          data: { userId, characterId: character.id, locale: 'ja' },
        });
      }
    }

    logger.info(`[GroupChat] Created conversation ${conversation.id} for user ${userId} with ${orderedCharacters.map(c => c.name).join(', ')}`);

    return NextResponse.json({
      conversationId: conversation.id,
      characters: orderedCharacters.map(c => ({
        id: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
      })),
    });
  } catch (error) {
    logger.error('[GroupChat/Create] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
