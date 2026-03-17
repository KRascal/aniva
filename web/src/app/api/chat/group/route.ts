import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { validateCrosstalk } from '@/lib/crosstalk-control';

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

    // グループチャット会話を取得（userId + metadata.type='group'）
    const groupConvs = await prisma.conversation.findMany({
      where: {
        userId,
        isActive: true,
        metadata: { path: ['type'], equals: 'group' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { role: true, content: true, createdAt: true, metadata: true },
        },
      },
    });

    // キャラクター情報を一括取得
    const allCharacterIds = [...new Set(
      groupConvs.flatMap(conv => {
        const meta = conv.metadata as { characterIds?: string[] };
        return meta?.characterIds ?? [];
      })
    )];
    const characters = allCharacterIds.length > 0
      ? await prisma.character.findMany({
          where: { id: { in: allCharacterIds } },
          select: { id: true, name: true, slug: true, avatarUrl: true },
        })
      : [];
    const charMap = new Map(characters.map(c => [c.id, c]));

    const conversations = groupConvs.map(conv => {
      const meta = conv.metadata as { characterIds?: string[]; isPinned?: boolean; pinnedAt?: string | null };
      const charIds = meta?.characterIds ?? [];
      const lastMsg = conv.messages[0] ?? null;
      return {
        id: conv.id,
        updatedAt: conv.updatedAt.toISOString(),
        isPinned: meta?.isPinned ?? false,
        pinnedAt: meta?.pinnedAt ?? null,
        characters: charIds.map(id => charMap.get(id)).filter(Boolean),
        lastMessage: lastMsg ? {
          role: lastMsg.role,
          content: lastMsg.content,
          createdAt: lastMsg.createdAt,
          characterName: (lastMsg.metadata as { characterName?: string })?.characterName,
        } : null,
      };
    });

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

    // 4b. 掛け合い制御バリデーション（複数キャラの場合のみ）
    if (characterIds.length >= 2) {
      const crosstalkCheck = await validateCrosstalk(characterIds);
      if (!crosstalkCheck.allowed) {
        return NextResponse.json(
          { error: 'CROSSTALK_NOT_ALLOWED', reason: crosstalkCheck.reason },
          { status: 403 },
        );
      }
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

    // 9.5. グループチャットメッセージをDBに保存（1つのグループConversationに集約）
    let groupConvId: string | null = null;
    try {
      // 同じキャラ組み合わせの既存グループ会話を検索
      const sortedCharIds = [...characterIds].sort();
      const existingGroupConvs = await prisma.conversation.findMany({
        where: {
          userId,
          isActive: true,
          metadata: { path: ['type'], equals: 'group' },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
      
      let groupConversation = existingGroupConvs.find(conv => {
        const meta = conv.metadata as { characterIds?: string[] };
        const convCharIds = [...(meta?.characterIds ?? [])].sort();
        return convCharIds.length === sortedCharIds.length && convCharIds.every((id, i) => id === sortedCharIds[i]);
      });

      if (!groupConversation) {
        groupConversation = await prisma.conversation.create({
          data: {
            userId,
            metadata: { type: 'group', characterIds: sortedCharIds } as Prisma.InputJsonValue,
          },
        });
      }
      groupConvId = groupConversation.id;

      // ユーザーメッセージ保存
      await prisma.message.create({
        data: {
          conversationId: groupConvId,
          role: 'USER',
          content: message,
          metadata: { groupChat: true, characterIds } as Prisma.InputJsonValue,
        },
      });
      // 各キャラの応答保存
      for (const charMsg of groupMessages) {
        await prisma.message.create({
          data: {
            conversationId: groupConvId,
            role: 'CHARACTER',
            content: charMsg.content,
            metadata: { 
              groupChat: true, 
              characterIds, 
              characterId: charMsg.characterId,
              characterName: charMsg.characterName,
              emotion: charMsg.emotion || null,
            } as Prisma.InputJsonValue,
          },
        });
      }
      // Conversation updatedAt更新
      await prisma.conversation.update({
        where: { id: groupConvId },
        data: { updatedAt: new Date() },
      });
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
      conversationId: groupConvId,
      characterIds,
    });
  } catch (error) {
    logger.error('[GroupChat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * グループチャット削除（ソフト削除: isActive = false）
 * DELETE /api/chat/group?conversationId=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // 所有確認
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // ソフト削除（isActive = false）
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[GroupChat] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
