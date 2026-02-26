import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * オンボーディングで交わした会話をDBに永続化する。
 * - Conversation を作成し、Messages を一括保存
 * - Relationship の totalMessages / lastMessageAt を更新
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { characterId, messages } = body as {
      characterId: string;
      messages: ChatMessage[];
    };

    if (!characterId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT' }, { status: 422 });
    }

    // Relationship 取得
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });

    if (!relationship) {
      return NextResponse.json({ success: false, error: 'NO_RELATIONSHIP' }, { status: 404 });
    }

    // 既にオンボーディング会話が保存済みなら重複防止
    const existingConvo = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
    });
    if (existingConvo) {
      return NextResponse.json({ success: true, data: { conversationId: existingConvo.id, skipped: true } });
    }

    // トランザクションで一括保存
    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          relationshipId: relationship.id,
          metadata: { source: 'onboarding' },
        },
      });

      const now = new Date();
      const messageData = messages.map((msg, i) => ({
        conversationId: conversation.id,
        role: msg.role === 'user' ? 'USER' as const : 'CHARACTER' as const,
        content: msg.content,
        createdAt: new Date(now.getTime() + i * 1000), // 1秒ずつずらして順序保証
      }));

      await tx.message.createMany({ data: messageData });

      // Relationship 更新
      const userMessageCount = messages.filter(m => m.role === 'user').length;
      await tx.relationship.update({
        where: { id: relationship.id },
        data: {
          totalMessages: { increment: userMessageCount },
          lastMessageAt: now,
          firstMessageAt: now,
        },
      });

      return conversation;
    });

    return NextResponse.json({ success: true, data: { conversationId: result.id } });
  } catch (error) {
    console.error('Onboarding persist-chat error:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
