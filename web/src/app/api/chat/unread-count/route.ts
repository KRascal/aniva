/**
 * GET /api/chat/unread-count
 * チャット一覧の未読合計数を返す（BottomNavバッジ用）
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ count: 0 });

  try {
    // ユーザーのrelationship一覧（最新メッセージ付き）
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      select: {
        characterId: true,
        lastMessageAt: true,
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
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

    // 各キャラの未読チェック（lastVisitはlocalStorageなのでサーバーでは概算）
    // キャラからの最新メッセージが存在する = 未読の可能性あり
    let chatUnread = 0;
    for (const rel of relationships) {
      const lastConv = rel.conversations[0];
      if (!lastConv?.messages[0]) continue;
      const lastMsg = lastConv.messages[0];
      if (lastMsg.role === 'CHARACTER') {
        // キャラからの最新メッセージ → 未読カウント
        chatUnread++;
      }
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
