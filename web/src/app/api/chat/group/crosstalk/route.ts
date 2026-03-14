import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * POST /api/chat/group/crosstalk
 * キャラ同士の掛け合いを1往復生成する（ユーザーメッセージなし）
 *
 * body: { conversationId: string }
 * コイン消費: characterCount * 10
 */

const COIN_PER_CHARACTER = 10; // 掛け合いコスト: キャラ数×10（2キャラ=20, 3キャラ=30）
const HISTORY_CONTEXT_LIMIT = 10;

interface GroupCharacterMessage {
  characterId: string;
  characterName: string;
  content: string;
  emotion: string;
}

interface ConversationMetadata {
  characterIds?: string[];
  characterNames?: string[];
  characterSlugs?: string[];
  type?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. 認証
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limit
    const rl = await checkRateLimit(`group-crosstalk:${userId}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      );
    }

    // 3. バリデーション
    const body = await req.json();
    const { conversationId } = body as { conversationId: string };

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // 4. Conversation取得・オーナーチェック
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    // Conversationのオーナーチェック: relationshipのuserId経由
    const relationship = await prisma.relationship.findUnique({
      where: { id: conversation.relationshipId },
      select: { userId: true },
    });
    const convMeta = conversation.metadata as ConversationMetadata | null;
    if (!relationship || relationship.userId !== userId || convMeta?.type !== 'group') {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const metadata = conversation.metadata as ConversationMetadata | null;
    const characterIds = metadata?.characterIds ?? [];
    if (characterIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 characters required for crosstalk' }, { status: 400 });
    }

    // 5. キャラクター情報取得
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true },
    });

    if (characters.length < 2) {
      return NextResponse.json({ error: 'Characters not found' }, { status: 404 });
    }

    // 6. FC会員チェック — FC会員は掛け合い無料
    const hasActiveFC = await prisma.characterSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: { id: true },
    });
    const isFcFree = !!hasActiveFC;

    // 7. コイン消費: キャラ数 × 10コイン（FC会員は無料）
    const totalCoinCost = isFcFree ? 0 : characters.length * COIN_PER_CHARACTER;

    // 8. コイン残高確認・消費（FC会員はスキップ）
    if (!isFcFree) {
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
            description: `掛け合い (${characters.map(c => c.name).join('・')})`,
            metadata: {
              crosstalk: true,
              characterIds,
              freeSpent,
              paidSpent,
            } as Prisma.InputJsonValue,
          },
        });
      });
    }

    // 8. Relationship取得
    const relationshipMap = new Map<string, string>();
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

    // 9. 過去メッセージ取得（直近10件、コンテキスト用）
    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_CONTEXT_LIMIT,
    });
    const historyContext = recentMessages
      .reverse()
      .map(m => {
        if (m.role === 'USER') return `ユーザー: ${m.content}`;
        const meta = m.metadata as Record<string, unknown> | null;
        const charName = (meta?.characterName as string) || 'キャラクター';
        return `${charName}: ${m.content}`;
      })
      .join('\n');

    // 10. キャラ順序を元のcharacterIdsの順で維持
    const orderedCharacters = characterIds
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null);

    // 11. 各キャラが順番に掛け合い生成
    const groupMessages: GroupCharacterMessage[] = [];

    for (let i = 0; i < orderedCharacters.length; i++) {
      const character = orderedCharacters[i];
      const relationshipId = relationshipMap.get(character.id)!;
      const otherChars = orderedCharacters.filter(c => c.id !== character.id);

      let contextMessage: string;

      if (i === 0) {
        // 1体目: 会話の流れを自然に続ける
        contextMessage = `[グループチャット設定]
あなたは${character.name}です。${otherChars.map(c => c.name).join('と')}と一緒にユーザーとグループチャットしています。

${historyContext ? `[これまでの会話]\n${historyContext}\n\n` : ''}[指示]
- ユーザーからの新しいメッセージはありません
- これまでの会話の流れを受けて、自然に話題を続けてください
- 他のキャラに話しかけたり、感想を言ったり、新しい話題を振ったりしてOK
- 1〜3文で自然に発言
- キャラクターの口調を完全に維持`;
      } else {
        // 2体目以降: 前のキャラの発言に反応
        const previousResponses = groupMessages.map(r => `${r.characterName}: 「${r.content}」`).join('\n');
        const lastCharName = groupMessages[groupMessages.length - 1]?.characterName;

        contextMessage = `[グループチャット設定]
あなたは${character.name}です。${otherChars.map(c => c.name).join('と')}と一緒にユーザーとグループチャットしています。

${historyContext ? `[これまでの会話]\n${historyContext}\n\n` : ''}[直前の発言]
${previousResponses}

[指示]
- ユーザーからの新しいメッセージはありません。キャラ同士で自然に会話を続けてください
- 「${lastCharName}」の発言に反応してください
- ツッコミ、同意、驚き、対抗意識、茶化しなど自然な掛け合いをしてください
- 1〜3文で返答
- キャラクターの口調を完全に維持`;
      }

      try {
        const response = await characterEngine.generateResponse(
          character.id,
          relationshipId,
          contextMessage,
          'ja',
          { isFcMember: false }
        );

        groupMessages.push({
          characterId: character.id,
          characterName: character.name,
          content: response.text,
          emotion: response.emotion,
        });
      } catch (err) {
        logger.error(`[Crosstalk] Failed to generate response for ${character.name}:`, err);
        groupMessages.push({
          characterId: character.id,
          characterName: character.name,
          content: '（少し考え中…）',
          emotion: 'neutral',
        });
      }
    }

    // 12. メッセージをDB保存
    for (const gm of groupMessages) {
      await prisma.message.create({
        data: {
          conversationId,
          role: 'CHARACTER',
          content: gm.content,
          metadata: {
            characterId: gm.characterId,
            characterName: gm.characterName,
            emotion: gm.emotion,
            crosstalk: true,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // 13. Conversation.updatedAt更新
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 14. 最新コイン残高取得
    const updatedBalance = await prisma.coinBalance.findUnique({ where: { userId } });
    const newBalance = updatedBalance
      ? updatedBalance.freeBalance + updatedBalance.paidBalance
      : 0;

    return NextResponse.json({
      conversationId,
      messages: groupMessages,
      coinCost: totalCoinCost,
      coinBalance: newBalance,
    });
  } catch (error) {
    logger.error('[Crosstalk] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
