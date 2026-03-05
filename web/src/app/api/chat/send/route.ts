import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkChatAccess, incrementMonthlyChat } from '@/lib/freemium';
import { updateStreak } from '@/lib/streak-system';
import { setCliffhanger } from '@/lib/cliffhanger-system';
import { Prisma } from '@prisma/client';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（IDOR修正: userIdはセッションから取得）
    const session = await auth();
    const userId = session?.user?.id;
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

    const { characterId: rawCharacterId, message, locale } = await req.json();

    if (!rawCharacterId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // slug/カスタムID両対応
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    // メッセージ長バリデーション
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    // キャラクター情報を最初に1回取得（以降はcachedCharacterを使用）
    const cachedCharacter = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        slug: true,
        freeMessageLimit: true,
        fcMonthlyPriceJpy: true,
        chatCoinPerMessage: true,
      },
    });
    if (!cachedCharacter) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Relationship取得 or 作成
    let relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
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
      return NextResponse.json(
        {
          error: 'FREE_LIMIT_REACHED',
          type: 'CHAT_LIMIT',
          freeMessageLimit: cachedCharacter.freeMessageLimit ?? 10,
          fcMonthlyPriceJpy: cachedCharacter.fcMonthlyPriceJpy ?? 3480,
        },
        { status: 402 },
      );
    } else if (access.type === 'COIN_REQUIRED') {
      // コイン消費: freeBalance優先 → paidBalance消費
      const coinCost = cachedCharacter.chatCoinPerMessage ?? 10;
      try {
        await prisma.$transaction(async (tx) => {
          const coinBalance = await tx.coinBalance.upsert({
            where: { userId },
            create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
            update: {},
          });

          const totalBalance = coinBalance.freeBalance + coinBalance.paidBalance;
          if (totalBalance < coinCost) {
            throw new Error('INSUFFICIENT_COINS');
          }

          // freeBalance優先消費
          const freeSpent = Math.min(coinBalance.freeBalance, coinCost);
          const paidSpent = coinCost - freeSpent;
          const newFreeBalance = coinBalance.freeBalance - freeSpent;
          const newPaidBalance = coinBalance.paidBalance - paidSpent;
          const newBalance = newFreeBalance + newPaidBalance;

          await tx.coinBalance.update({
            where: { userId },
            data: {
              balance: newBalance,
              freeBalance: newFreeBalance,
              paidBalance: newPaidBalance,
            },
          });

          await tx.coinTransaction.create({
            data: {
              userId,
              type: 'CHAT_EXTRA',
              amount: -coinCost,
              balanceAfter: newBalance,
              characterId,
              description: 'チャット送信',
              metadata: { freeSpent, paidSpent } as Prisma.InputJsonValue,
            },
          });
        });
        consumed = 'COIN_REQUIRED';
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : '';
        if (errMsg === 'INSUFFICIENT_COINS') {
          return NextResponse.json(
            {
              error: 'FREE_LIMIT_REACHED',
              type: 'CHAT_LIMIT',
              freeMessageLimit: cachedCharacter.freeMessageLimit ?? 10,
              fcMonthlyPriceJpy: cachedCharacter.fcMonthlyPriceJpy ?? 3480,
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

    // 4. Character Engine で応答生成（FC会員は高品質モデル使用）
    const isFcMember = consumed === 'FC_UNLIMITED';
    const response = await characterEngine.generateResponse(
      characterId,
      relationship.id,
      message,
      typeof locale === 'string' ? locale : 'ja',
      { isFcMember },
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

    // 7a. ストリーク更新
    let streakResult: { streakDays: number; isNew: boolean; milestone: number | null } | null = null;
    try {
      streakResult = await updateStreak(relationship.id);
    } catch (e) {
      console.warn('Streak update failed (migration pending?):', e);
    }

    // 7b. クリフハンガー設定（20%の確率、1日1回 — 会話が5往復以上の時のみ）
    let cliffhangerTease: string | null = null;
    try {
      const msgCount = await prisma.message.count({
        where: { conversation: { relationshipId: relationship.id }, role: 'USER' },
      });
      if (msgCount >= 5 && Math.random() < 0.2) {
        const cliffhanger = await setCliffhanger(relationship.id, cachedCharacter.slug ?? 'luffy');
        if (cliffhanger) {
          cliffhangerTease = cliffhanger.teaseMessage;
        }
      }
    } catch (e) {
      console.warn('Cliffhanger set failed (migration pending?):', e);
    }

    // 7c. FREE の場合、月次チャットカウントをインクリメント
    if (access.type === 'FREE') {
      await incrementMonthlyChat(userId, characterId);
    }

    // 8. 更新後のrelationshipを再取得してleveledUpを判定
    const updatedRelationship = await prisma.relationship.findUnique({
      where: { id: relationship.id },
    });

    const leveledUp = (updatedRelationship?.level ?? 1) > prevLevel;
    const newLevel = updatedRelationship?.level ?? 1;

    // メッセージ数マイルストーン判定（10/50/100/200/500通）
    const totalMsgCount = await prisma.message.count({
      where: { conversation: { relationshipId: relationship.id } },
    }).catch(() => 0);
    const MILESTONES: Record<number, string> = {
      10:  '初めての10通！',
      50:  '50通達成！',
      100: '100通の絆！',
      200: '200通…本物だ',
      500: '伝説の500通',
    };
    const msgMilestone = MILESTONES[totalMsgCount] ?? null;

    // コイン残高取得（UI表示用）
    const latestBalance = await prisma.coinBalance.findUnique({ where: { userId } });
    const coinBalance = latestBalance ? latestBalance.freeBalance + latestBalance.paidBalance : undefined;

    // ⑦ ボイスメモヒント: 特別な瞬間にキャラの声を自動再生するトリガー
    // - レベルアップ時
    // - ストリークマイルストーン（7日, 14日, 30日, 100日）
    // - メッセージマイルストーン（100通, 500通）
    const VOICE_STREAK_MILESTONES = [7, 14, 30, 100];
    const VOICE_MSG_MILESTONES = [100, 500];
    const voiceHint = leveledUp
      || (streakResult?.milestone && VOICE_STREAK_MILESTONES.includes(streakResult.milestone))
      || (totalMsgCount && VOICE_MSG_MILESTONES.includes(totalMsgCount))
      ? {
          trigger: leveledUp ? 'level_up' : streakResult?.milestone ? 'streak' : 'msg_milestone',
          emotion: leveledUp ? 'excited' : 'happy',
        }
      : undefined;

    return NextResponse.json({
      userMessage: userMsg,
      characterMessage: charMsg,
      emotion: response.emotion,
      consumed,
      cliffhangerTease,
      voiceHint,
      streak: streakResult ? {
        days: streakResult.streakDays,
        isNew: streakResult.isNew,
        milestone: streakResult.milestone,
      } : undefined,
      relationship: {
        level: updatedRelationship?.level ?? 1,
        xp: updatedRelationship?.experiencePoints ?? 0,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        msgMilestone,
        totalMsgCount,
        freeMessagesRemaining: access.type === 'FREE' ? (access as { freeMessagesRemaining?: number }).freeMessagesRemaining : undefined,
        coinBalance,
      },
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
