import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * グループチャット一覧取得API
 * GET /api/chat/group
 *
 * response: {
 *   conversations: Array<{ id, updatedAt, characters, lastMessage }>
 * }
 */
export async function GET() {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // グループチャット会話を取得（metadata.groupChat = true のメッセージがある会話）
    // Relationship経由でユーザーの会話を取得し、グループフラグのあるものをフィルタ
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      select: { id: true, characterId: true },
    });
    const relIds = relationships.map(r => r.id);

    // グループチャットメッセージがある会話を検索
    const groupMessages = await prisma.message.findMany({
      where: {
        conversation: { relationshipId: { in: relIds } },
        metadata: { path: ['groupChat'], equals: true },
      },
      select: {
        conversationId: true,
        metadata: true,
        conversation: {
          select: {
            id: true,
            updatedAt: true,
            relationshipId: true,
          },
        },
      },
      distinct: ['conversationId'],
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 会話ごとにキャラ情報と最新メッセージを集める
    const conversationMap = new Map<string, {
      id: string;
      updatedAt: Date;
      characterIds: string[];
    }>();

    for (const msg of groupMessages) {
      const conv = msg.conversation;
      if (!conversationMap.has(conv.id)) {
        const meta = msg.metadata as Record<string, unknown>;
        const characterIds = Array.isArray(meta.characterIds)
          ? (meta.characterIds as string[])
          : [];
        conversationMap.set(conv.id, {
          id: conv.id,
          updatedAt: conv.updatedAt,
          characterIds,
        });
      }
    }

    // キャラクター情報を一括取得
    const allCharacterIds = [...new Set([...conversationMap.values()].flatMap(c => c.characterIds))];
    const characters = await prisma.character.findMany({
      where: { id: { in: allCharacterIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });
    const charMap = new Map(characters.map(c => [c.id, c]));

    // 各会話の最新メッセージを取得
    const convIds = [...conversationMap.keys()];
    const lastMessages = await prisma.message.findMany({
      where: { conversationId: { in: convIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['conversationId'],
      select: {
        conversationId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
    const lastMsgMap = new Map(lastMessages.map(m => [m.conversationId, m]));

    const conversations = [...conversationMap.values()]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(conv => ({
        id: conv.id,
        updatedAt: conv.updatedAt.toISOString(),
        characters: conv.characterIds.map(id => charMap.get(id)).filter(Boolean),
        lastMessage: lastMsgMap.get(conv.id) ?? null,
      }));

    return NextResponse.json({ conversations });
  } catch (error) {
    logger.error('[GroupChat] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * グループチャットAPI
 * POST /api/chat/group
 *
 * body: {
 *   characterIds: string[]   // 参加キャラIDリスト (最大3体)
 *   message: string          // ユーザーメッセージ
 *   locale?: string
 * }
 *
 * response: {
 *   messages: Array<{ characterId, characterName, content, emotion }>
 *   coinCost: number
 *   coinBalance: number
 * }
 */

interface GroupCharacterMessage {
  characterId: string;
  characterName: string;
  content: string;
  emotion: string;
}

const DEFAULT_COIN_PER_MESSAGE = 10;
const MAX_CHARACTERS = 3;

export async function POST(req: NextRequest) {
  try {
    // 1. 認証（DB存在チェック付き — FK violation防止）
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limit
    const rl = await checkRateLimit(`group-chat:${userId}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      );
    }

    // 3. バリデーション
    const body = await req.json();
    const { characterIds, message, locale = 'ja' } = body as {
      characterIds: string[];
      message: string;
      locale?: string;
    };

    if (!Array.isArray(characterIds) || characterIds.length < 1) {
      return NextResponse.json({ error: 'characterIds must be a non-empty array' }, { status: 400 });
    }
    if (characterIds.length > MAX_CHARACTERS) {
      return NextResponse.json({ error: `Max ${MAX_CHARACTERS} characters allowed` }, { status: 400 });
    }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 });
    }

    // 4. キャラクター情報取得
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true, chatCoinPerMessage: true },
    });

    if (characters.length !== characterIds.length) {
      return NextResponse.json({ error: 'Some characters not found' }, { status: 404 });
    }

    // 5. コイン消費: 参加キャラ数 × 通常チャットコスト
    const totalCoinCost = characters.reduce(
      (sum, c) => sum + (c.chatCoinPerMessage ?? DEFAULT_COIN_PER_MESSAGE),
      0
    );

    // 6. コイン残高確認・消費
    const coinBalance = await prisma.coinBalance.upsert({
      where: { userId },
      create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
      update: {},
    });

    const totalBalance = coinBalance.freeBalance + coinBalance.paidBalance;
    if (totalBalance < totalCoinCost) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_COINS',
          required: totalCoinCost,
          current: totalBalance,
        },
        { status: 402 }
      );
    }

    // コイン消費トランザクション
    await prisma.$transaction(async (tx) => {
      const cb = await tx.coinBalance.findUniqueOrThrow({ where: { userId } });
      const freeSpent = Math.min(cb.freeBalance, totalCoinCost);
      const paidSpent = totalCoinCost - freeSpent;

      await tx.coinBalance.update({
        where: { userId },
        data: {
          freeBalance: cb.freeBalance - freeSpent,
          paidBalance: cb.paidBalance - paidSpent,
          balance: cb.freeBalance + cb.paidBalance - totalCoinCost,
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          type: 'CHAT_EXTRA',
          amount: -totalCoinCost,
          balanceAfter: totalBalance - totalCoinCost,
          description: `グループチャット (${characters.map(c => c.name).join('・')})`,
          metadata: {
            groupChat: true,
            characterIds,
            freeSpent,
            paidSpent,
          } as Prisma.InputJsonValue,
        },
      });
    });

    // 7. 各キャラのRelationship取得 or 作成
    const relationshipMap = new Map<string, string>(); // characterId → relationshipId
    for (const character of characters) {
      let rel = await prisma.relationship.findUnique({
        where: { userId_characterId_locale: { userId, characterId: character.id, locale: 'ja' } },
      });
      if (!rel) {
        rel = await prisma.relationship.create({
          data: { userId, characterId: character.id, locale: 'ja' },
        });
      }
      relationshipMap.set(character.id, rel.id);
    }

    // 8. キャラIDリストをリクエスト順に並べる
    const orderedCharacters = characterIds
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null);

    // 9. 各キャラが順番に応答生成（前のキャラの発言をコンテキストに含める）
    const groupMessages: GroupCharacterMessage[] = [];

    for (const character of orderedCharacters) {
      const relationshipId = relationshipMap.get(character.id)!;

      // 前キャラの発言をコンテキストとして付加
      let contextMessage = message;
      if (groupMessages.length > 0) {
        const prevTalks = groupMessages
          .map(m => `${m.characterName}:「${m.content}」`)
          .join('\n');
        contextMessage = `[グループチャットの状況]\nユーザー:「${message}」\n${prevTalks}\n\n上記の会話を踏まえて、あなた（${character.name}）の視点から自然に応答してください。`;
      }

      try {
        const response = await characterEngine.generateResponse(
          character.id,
          relationshipId,
          contextMessage,
          locale,
          { isFcMember: false }
        );

        groupMessages.push({
          characterId: character.id,
          characterName: character.name,
          content: response.text,
          emotion: response.emotion,
        });
      } catch (err) {
        logger.error(`[GroupChat] Failed to generate response for ${character.name}:`, err);
        groupMessages.push({
          characterId: character.id,
          characterName: character.name,
          content: '（少し考え中…）',
          emotion: 'neutral',
        });
      }
    }

    // 9.5. グループチャットメッセージをDBに保存（各キャラのConversationに）
    try {
      for (const character of orderedCharacters) {
        const relationshipId = relationshipMap.get(character.id)!;
        // Conversationを取得 or 作成
        let conversation = await prisma.conversation.findFirst({
          where: { relationshipId, isActive: true },
          orderBy: { updatedAt: 'desc' },
        });
        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: { relationshipId, metadata: { type: 'group' } },
          });
        }
        // ユーザーメッセージ保存
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'USER',
            content: message,
            metadata: { groupChat: true, characterIds } as Prisma.InputJsonValue,
          },
        });
        // キャラ応答保存
        const charMsg = groupMessages.find(m => m.characterId === character.id);
        if (charMsg) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'CHARACTER',
              content: charMsg.content,
              emotion: charMsg.emotion || null,
              metadata: { groupChat: true, characterIds } as Prisma.InputJsonValue,
            },
          });
        }
        // Conversation updatedAt更新
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
      }
    } catch (saveErr) {
      logger.error('[GroupChat] Failed to save messages to DB:', saveErr);
      // 保存失敗しても応答は返す
    }

    // 10. 最新コイン残高取得
    const updatedBalance = await prisma.coinBalance.findUnique({ where: { userId } });
    const newBalance = updatedBalance
      ? updatedBalance.freeBalance + updatedBalance.paidBalance
      : totalBalance - totalCoinCost;

    return NextResponse.json({
      messages: groupMessages,
      coinCost: totalCoinCost,
      coinBalance: newBalance,
    });
  } catch (error) {
    logger.error('[GroupChat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
