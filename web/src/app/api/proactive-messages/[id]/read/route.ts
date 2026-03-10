/**
 * POST /api/proactive-messages/[id]/read
 * メッセージを既読にする
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await prisma.characterProactiveMessage.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // キャラクターのslugを取得してchatUrl生成
    const character = await prisma.character.findUnique({
      where: { id: message.characterId },
      select: { slug: true },
    });
    const chatUrl = character?.slug ? `/chat/${character.slug}` : null;

    if (message.isRead) {
      return NextResponse.json({ ok: true, alreadyRead: true, chatUrl });
    }

    // プロアクティブメッセージをチャットメッセージとしても保存
    await prisma.$transaction(async (tx) => {
      await tx.characterProactiveMessage.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });

      // Relationship経由でConversation取得/作成
      const relationship = await tx.relationship.findFirst({
        where: { userId: session.user!.id, characterId: message.characterId },
      });
      if (!relationship) return; // フォローしてない場合はスキップ

      let conversation = await tx.conversation.findFirst({
        where: { relationshipId: relationship.id },
        orderBy: { updatedAt: 'desc' },
      });
      if (!conversation) {
        conversation = await tx.conversation.create({
          data: { relationshipId: relationship.id },
        });
      }

      // プロアクティブメッセージをチャットメッセージとして追加（重複防止）
      const existing = await tx.message.findFirst({
        where: {
          conversationId: conversation.id,
          role: 'CHARACTER',
          content: message.content,
          metadata: { path: ['proactiveMessageId'], equals: message.id },
        },
      });
      if (!existing) {
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            role: 'CHARACTER',
            content: message.content,
            metadata: { proactiveMessageId: message.id, type: 'proactive' },
          },
        });
        // Conversation更新時刻を更新
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ ok: true, chatUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
