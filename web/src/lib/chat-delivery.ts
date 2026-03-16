// @ts-nocheck
/**
 * chat-delivery.ts
 * チャット配信の作成・取得を担う唯一のモジュール。
 * 既存のチャット/手紙/ストーリーコードに手を加えない。疎結合設計。
 * NOTE: ChatDelivery model not yet migrated to schema. Suppressed until migration.
 */

import { prisma } from '@/lib/prisma';
import type { ChatDelivery, Prisma } from '@prisma/client';

export type DeliveryType = 'letter' | 'story_chapter' | 'event_scenario';

export interface ChatDeliveryWithDetails extends ChatDelivery {
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
  };
}

/**
 * チャットにデリバリーメッセージを注入する。
 * - CHARACTER role の Message を作成（metadata.isDelivery = true）
 * - ChatDelivery レコードを作成
 * - Conversation.updatedAt を更新
 * 既存の手紙・ストーリーロジックには一切触れない。
 */
export async function deliverToChat(params: {
  conversationId: string;
  userId: string;
  characterId: string;
  deliveryType: DeliveryType;
  referenceId: string;
  previewContent: string;
}): Promise<ChatDelivery> {
  const { conversationId, userId, characterId, deliveryType, referenceId, previewContent } = params;

  // 二重配信を防ぐ（unique制約と同じ条件で事前チェック）
  const existing = await prisma.chatDelivery.findUnique({
    where: {
      conversationId_deliveryType_referenceId: {
        conversationId,
        deliveryType,
        referenceId,
      },
    },
  });
  if (existing) return existing;

  // トランザクションで Message + ChatDelivery を作成
  const [message, delivery] = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: 'CHARACTER',
        content: previewContent,
        metadata: {
          type: deliveryType,
          referenceId,
          isDelivery: true,
        } as Prisma.InputJsonValue,
      },
    });

    const dlv = await tx.chatDelivery.create({
      data: {
        conversationId,
        userId,
        characterId,
        deliveryType,
        referenceId,
        messageId: msg.id,
        isRead: false,
      },
    });

    // Conversation.updatedAt を更新（lastMessageAt相当）
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return [msg, dlv] as const;
  });

  void message; // unused variable suppression
  return delivery;
}

/**
 * 会話の配信一覧を取得する。
 */
export async function getDeliveries(params: {
  conversationId: string;
  unreadOnly?: boolean;
}): Promise<ChatDeliveryWithDetails[]> {
  const { conversationId, unreadOnly } = params;

  const deliveries = await prisma.chatDelivery.findMany({
    where: {
      conversationId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    include: {
      character: {
        select: {
          id: true,
          name: true,
          slug: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { deliveredAt: 'asc' },
  });

  return deliveries as ChatDeliveryWithDetails[];
}

/**
 * 配信を既読にする。
 */
export async function markDeliveryRead(deliveryId: string): Promise<void> {
  await prisma.chatDelivery.update({
    where: { id: deliveryId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * メッセージIDから対応する ChatDelivery を取得する。
 * ChatDeliveryBubble が既読マークするために使う。
 */
export async function getDeliveryByMessageId(messageId: string): Promise<ChatDelivery | null> {
  return prisma.chatDelivery.findFirst({
    where: { messageId },
  });
}
