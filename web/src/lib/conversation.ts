/**
 * conversation.ts — 会話(Conversation)の取得・作成を一元管理
 * 
 * 原則: 1つのRelationshipに対してConversationは1つだけ。
 * cron/API問わず全ての会話作成はこの関数を通す。
 * 既存のconversationがあればそれを返し、なければ新規作成する。
 */

import { prisma } from '@/lib/prisma';

/**
 * RelationshipIDに紐づく唯一のConversationを取得 or 作成する。
 * 複数conversationが存在する場合は最新のものを返す（既存データ互換）。
 */
export async function getOrCreateConversation(relationshipId: string): Promise<{
  id: string;
  relationshipId: string;
  updatedAt: Date;
  createdAt: Date;
}> {
  // 既存のconversationを探す（最新のupdatedAt）
  const existing = await prisma.conversation.findFirst({
    where: { relationshipId },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  // なければ新規作成
  return prisma.conversation.create({
    data: { relationshipId },
  });
}

/**
 * RelationshipIDに紐づく全てのConversationのIDを返す。
 * 履歴取得・アルバム取得で全conversation横断検索に使う。
 */
export async function getAllConversationIds(relationshipId: string): Promise<string[]> {
  const conversations = await prisma.conversation.findMany({
    where: { relationshipId },
    select: { id: true },
  });
  return conversations.map((c) => c.id);
}
