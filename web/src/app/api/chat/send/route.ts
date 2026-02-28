import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkChatAccess, incrementMonthlyChat } from '@/lib/freemium';
import { Prisma } from '@prisma/client';

const COIN_COST = 10;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（IDOR修正: userIdはセッションから取得）
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limit: 30req/min per user
    const rl = checkRateLimit(`chat:${userId}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const { characterId, message } = await req.json();

    if (!characterId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // メッセージ長バリデーション
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    // Relationship取得 or 作成
    let relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });

    if (!relationship) {
      relationship = await prisma.relationship.create({
        data: { userId, characterId },
      });
    }

    // ─── フリーミアム判定 ─────────────────────────────────────────────────────
    const access = await checkChatAccess(userId, characterId);
    let consumed: 'FREE' | 'FC_UNLIMITED' | 'COIN_REQUIRED' = 'FREE';

    if (access.type === 'BLOCKED') {
      // 月次制限に達しており、コインも不足
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: { freeMessageLimit: true, fcMonthlyPriceJpy: true },
      });
      return NextResponse.json(
        {
          error: 'FREE_LIMIT_REACHED',
          type: 'CHAT_LIMIT',
          freeMessageLimit: character?.freeMessageLimit ?? 10,
          fcMonthlyPriceJpy: character?.fcMonthlyPriceJpy ?? 3480,
        },
        { status: 402 },
      );
    } else if (access.type === 'COIN_REQUIRED') {
      // コイン消費（coins/spend と同じロジック）
      try {
        await prisma.$transaction(async (tx) => {
          const coinBalance = await tx.coinBalance.upsert({
            where: { userId },
            create: { userId, balance: 0 },
            update: {},
          });

          if (coinBalance.balance < COIN_COST) {
            throw new Error('INSUFFICIENT_COINS');
          }

          const newBalance = coinBalance.balance - COIN_COST;

          await tx.coinBalance.update({
            where: { userId },
            data: { balance: newBalance },
          });

          await tx.coinTransaction.create({
            data: {
              userId,
              type: 'CHAT_EXTRA',
              amount: -COIN_COST,
              balanceAfter: newBalance,
              characterId,
              description: 'チャット送信',
              metadata: {} as Prisma.InputJsonValue,
            },
          });
        });
        consumed = 'COIN_REQUIRED';
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : '';
        if (errMsg === 'INSUFFICIENT_COINS') {
          const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { freeMessageLimit: true, fcMonthlyPriceJpy: true },
          });
          return NextResponse.json(
            {
              error: 'FREE_LIMIT_REACHED',
              type: 'CHAT_LIMIT',
              freeMessageLimit: character?.freeMessageLimit ?? 10,
              fcMonthlyPriceJpy: character?.fcMonthlyPriceJpy ?? 3480,
            },
            { status: 402 },
          );
        }
        throw err;
      }
    } else if (access.type === 'FC_UNLIMITED') {
      consumed = 'FC_UNLIMITED';
    } else {
      // FREE
      consumed = 'FREE';
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 送信前のlevelを記憶
    const prevLevel = relationship?.level ?? 1;

    // 2. 会話取得 or 作成
    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { relationshipId: relationship.id },
      });
    }

    // 3. ユーザーメッセージ保存
    const userMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // 4. Character Engine で応答生成
    const response = await characterEngine.generateResponse(
      characterId,
      relationship.id,
      message,
    );

    // 5. キャラクター応答保存
    const charMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: response.text,
        metadata: {
          emotion: response.emotion,
          shouldGenerateImage: response.shouldGenerateImage,
          shouldGenerateVoice: response.shouldGenerateVoice,
        },
      },
    });

    // 6. 会話のupdatedAt更新
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 7. FREE の場合、月次チャットカウントをインクリメント
    if (access.type === 'FREE') {
      await incrementMonthlyChat(userId, characterId);
    }

    // 8. 更新後のrelationshipを再取得してleveledUpを判定
    const updatedRelationship = await prisma.relationship.findUnique({
      where: { id: relationship.id },
    });

    const leveledUp = (updatedRelationship?.level ?? 1) > prevLevel;
    const newLevel = updatedRelationship?.level ?? 1;

    return NextResponse.json({
      userMessage: userMsg,
      characterMessage: charMsg,
      emotion: response.emotion,
      consumed,
      relationship: {
        level: updatedRelationship?.level ?? 1,
        xp: updatedRelationship?.experiencePoints ?? 0,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        freeMessagesRemaining: access.type === 'FREE' ? (access as { freeMessagesRemaining?: number }).freeMessagesRemaining : undefined,
      },
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
