/**
 * DeliveryWriter — 生成メッセージをDBに書き込み、Push通知をトリガーする
 * 責務:
 * - Message作成（role: 'CHARACTER', metadata: { source: 'agent', ...decision }）
 * - Relationship.agentDailyContactCount インクリメント
 * - CharacterAgentDecision 更新（wasExecuted: true）
 * - Push通知（既存 web-push-sender を使用）
 */

import { logger } from '@/lib/logger';
import { prisma } from '../prisma';
import type { AgentDecision } from './types';
import { sendPushNotification } from '../web-push-sender';

interface DeliveryInput {
  relationshipId: string;
  characterId: string;
  userId: string;
  characterName: string;
  content: string;
  decision: AgentDecision;
  decisionId?: string; // CharacterAgentDecision.id（あれば更新）
}

interface DeliveryResult {
  messageId: string;
  pushSent: number;
}

/**
 * メッセージをDBに保存し、カウンタ更新・Push通知を実行する
 */
export async function deliverAgentMessage(input: DeliveryInput): Promise<DeliveryResult> {
  const { relationshipId, characterId, userId, characterName, content, decision, decisionId } = input;

  // 1. Conversationを取得（最新1件）
  const conversation = await prisma.conversation.findFirst({
    where: { relationshipId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (!conversation) {
    throw new Error(`[DeliveryWriter] No conversation found for relationship ${relationshipId}`);
  }

  // 2. Messageを作成
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'CHARACTER',
      content,
      metadata: {
        source: 'agent',
        messageType: decision.messageType ?? 'check_in',
        urgency: decision.urgency,
        reason: decision.reason,
        automated: true,
      },
    },
    select: { id: true },
  });

  logger.info(`[DeliveryWriter] Message created: ${message.id} for relationship ${relationshipId}`);

  // 3. Relationship.agentDailyContactCount をインクリメント
  //    agentDailyResetAt をチェックして日付をまたいでいたらリセット
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { agentDailyContactCount: true, agentDailyResetAt: true },
  });

  const now = new Date();
  const todayJST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  todayJST.setHours(0, 0, 0, 0);

  const needsReset = !relationship?.agentDailyResetAt
    || relationship.agentDailyResetAt < todayJST;

  await prisma.relationship.update({
    where: { id: relationshipId },
    data: {
      agentDailyContactCount: needsReset ? 1 : { increment: 1 },
      agentDailyResetAt: needsReset ? now : undefined,
      agentLastDecisionAt: now,
    },
  });

  // 4. CharacterAgentDecision を更新（wasExecuted: true）
  if (decisionId) {
    await prisma.characterAgentDecision.update({
      where: { id: decisionId },
      data: {
        wasExecuted: true,
        executedAt: now,
        messageId: message.id,
      },
    }).catch(e => {
      logger.warn('[DeliveryWriter] Failed to update CharacterAgentDecision:', e);
    });
  }

  // 5. Push通知（失敗してもスキップ）
  let pushSent = 0;
  try {
    const pushResult = await sendPushNotification(
      userId,
      characterName,
      content.slice(0, 100),
      `/chat/${characterId}`,
    );
    pushSent = pushResult.sent;
    if (pushSent > 0) {
      logger.info(`[DeliveryWriter] Push sent: ${pushSent} devices for user ${userId}`);
    }
  } catch (e) {
    logger.warn('[DeliveryWriter] Push notification failed (skipped):', e);
  }

  return { messageId: message.id, pushSent };
}

/**
 * CharacterAgentDecision を作成する（実行前の記録）
 */
export async function recordAgentDecision(params: {
  characterId: string;
  userId: string;
  relationshipId: string;
  decision: AgentDecision;
  skippedReason?: string;
}): Promise<string> {
  const { characterId, userId, relationshipId, decision, skippedReason } = params;

  const record = await prisma.characterAgentDecision.create({
    data: {
      characterId,
      userId,
      relationshipId,
      shouldContact: decision.should,
      decisionReason: decision.reason,
      messageType: decision.messageType ?? undefined,
      urgency: decision.urgency,
      skippedReason: skippedReason ?? undefined,
      decisionModel: 'grok-3-mini-fast',
    },
    select: { id: true },
  });

  return record.id;
}
