/**
 * プッシュDM AI Cron エンドポイント
 * POST /api/cron/push-dm-ai
 * Header: x-cron-secret
 *
 * 処理フロー:
 *   1. フォロー中の Relationship を取得 (isFollowing=true)
 *   2. 1日3通上限チェック (CharacterProactiveMessage.createdAt >= 本日0時JST)
 *   3. 8hクールダウンチェック
 *   4. AI生成 (push-dm-generator)
 *   5. CharacterProactiveMessage 保存 (trigger="scheduled")
 *   6. Web Push 送信 (web-push-sender)
 *
 * スケジュール例: 30 8,20 * * * (JST 8:30/20:30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePushDmMessage, getCurrentTimeSlot } from '@/lib/push-dm-generator';
import { sendPushNotification } from '@/lib/web-push-sender';

const MAX_PER_RUN = 50;
const DAILY_LIMIT = 3;
const COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8時間
const EXPIRES_IN_MS = 8 * 60 * 60 * 1000; // 8時間で期限切れ (FOMO強化)

/** 本日0時JST を UTC で返す */
function getTodayStartJST(): Date {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setUTCHours(0, 0, 0, 0);
  // JST 0時 = UTC -9時間
  return new Date(jst.getTime() - 9 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  // 認証
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayStartJST = getTodayStartJST();
  const timeSlot = getCurrentTimeSlot();

  // フォロー中のリレーションシップを取得（バッチ上限考慮して多めに）
  const relationships = await prisma.relationship.findMany({
    where: { isFollowing: true },
    include: {
      character: {
        select: { id: true, name: true, systemPrompt: true },
      },
      user: {
        select: { id: true, displayName: true, nickname: true },
      },
    },
    take: MAX_PER_RUN * 3,
    orderBy: { lastMessageAt: 'asc' }, // 最近アクティブでないユーザーを優先
  });

  const skipped = { dailyLimit: 0, cooldown: 0, noPushSub: 0, llmError: 0 };
  let totalSent = 0;
  let errors = 0;

  for (const rel of relationships) {
    if (totalSent >= MAX_PER_RUN) break;

    // 1. 1日3通上限チェック
    const todayCount = await prisma.characterProactiveMessage.count({
      where: {
        userId: rel.userId,
        characterId: rel.characterId,
        createdAt: { gte: todayStartJST },
      },
    });
    if (todayCount >= DAILY_LIMIT) {
      skipped.dailyLimit++;
      continue;
    }

    // 2. 8hクールダウンチェック
    const recentMessage = await prisma.characterProactiveMessage.findFirst({
      where: {
        userId: rel.userId,
        characterId: rel.characterId,
        createdAt: { gte: new Date(now.getTime() - COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recentMessage) {
      skipped.cooldown++;
      continue;
    }

    // 3. Push サブスクリプション確認（事前チェック）
    const subCount = await prisma.pushSubscription.count({
      where: { userId: rel.userId },
    });
    if (subCount === 0) {
      skipped.noPushSub++;
      continue;
    }

    // 4. 直近会話10件を取得
    const conversations = await prisma.conversation.findMany({
      where: { relationshipId: rel.id },
      orderBy: { updatedAt: 'desc' },
      take: 1,
      select: { id: true },
    });

    let recentMessages: Array<{ role: string; content: string }> = [];
    if (conversations.length > 0) {
      const rawMessages = await prisma.message.findMany({
        where: { conversationId: conversations[0].id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { role: true, content: true },
      });
      recentMessages = rawMessages.reverse();
    }

    // ユーザー名の解決
    const userName =
      rel.user.nickname ||
      rel.user.displayName ||
      (rel.memorySummary && typeof rel.memorySummary === 'object'
        ? ((rel.memorySummary as Record<string, unknown>).userName as string) ?? 'あなた'
        : 'あなた');

    // 5. AI生成
    let dmResult: { content: string; timeSlot: typeof timeSlot };
    try {
      dmResult = await generatePushDmMessage({
        systemPrompt: rel.character.systemPrompt,
        characterName: rel.character.name,
        userName,
        level: rel.level,
        memorySummary: rel.memorySummary,
        recentMessages,
        timeSlot,
      });
    } catch (e) {
      console.error('[push-dm-ai] LLM error:', e);
      skipped.llmError++;
      errors++;
      continue;
    }

    if (!dmResult.content) {
      skipped.llmError++;
      errors++;
      continue;
    }

    // 6. CharacterProactiveMessage 保存
    await prisma.characterProactiveMessage.create({
      data: {
        characterId: rel.characterId,
        userId: rel.userId,
        content: dmResult.content,
        trigger: 'scheduled',
        expiresAt: new Date(now.getTime() + EXPIRES_IN_MS),
        locale: rel.locale || 'ja',
        metadata: {
          generatedBy: 'push-dm-ai',
          timeSlot: dmResult.timeSlot,
          relationshipLevel: rel.level,
        },
      },
    });

    // 7. Web Push 送信
    const charName = rel.character.name;
    const pushResult = await sendPushNotification(
      rel.userId,
      `${charName}からメッセージ`,
      dmResult.content,
      `/chat/${rel.characterId}`,
    );

    if (pushResult.sent > 0) {
      totalSent++;
    } else if (pushResult.sent === 0 && pushResult.failed === 0) {
      // サブスクリプションなし（並列削除済みなど）
      skipped.noPushSub++;
    }
  }

  return NextResponse.json({
    ok: true,
    totalSent,
    skipped,
    errors,
    timeSlot,
  });
}
