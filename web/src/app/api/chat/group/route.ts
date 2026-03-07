import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { Prisma } from '@prisma/client';

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
    // 1. 認証
    const session = await auth();
    const userId = session?.user?.id;
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
          data: { userId, characterId: character.id },
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
        console.error(`[GroupChat] Failed to generate response for ${character.name}:`, err);
        groupMessages.push({
          characterId: character.id,
          characterName: character.name,
          content: '（少し考え中…）',
          emotion: 'neutral',
        });
      }
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
    console.error('[GroupChat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
