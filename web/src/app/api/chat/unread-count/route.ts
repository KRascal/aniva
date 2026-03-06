/**
 * GET /api/chat/unread-count
 * チャット未読数を返す（BottomNavバッジ用）
 * 未読 = キャラからの最新メッセージの後にユーザーが返信していない会話
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ count: 0 });

  try {
    // ユーザーの全relationship（最新会話の最新2メッセージ取得）
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      select: {
        characterId: true,
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 2,
              select: { role: true, createdAt: true },
            },
          },
        },
      },
    });

    // 未読proactiveメッセージ数
    const proactiveUnread = await prisma.characterProactiveMessage.count({
      where: {
        userId,
        isRead: false,
        expiresAt: { gt: new Date() },
      },
    });

    let chatUnread = 0;
    for (const rel of relationships) {
      const lastConv = rel.conversations[0];
      if (!lastConv?.messages[0]) continue;
      const msgs = lastConv.messages; // [newest, second-newest]
      
      // 最新メッセージがキャラからで、かつその後にユーザーの返信がない = 未読
      if (msgs[0].role === 'CHARACTER') {
        // 最新がCHARACTER → 未読
        chatUnread++;
      }
      // 最新がUSER → 既読（ユーザーが返信済み）
    }

    return NextResponse.json({
      count: chatUnread + proactiveUnread,
      chatUnread,
      proactiveUnread,
    });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
