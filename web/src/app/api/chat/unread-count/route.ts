import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/chat/unread-count
 * サーバーサイドでチャット未読数を正確に計算
 * 
 * ロジック:
 * - フォロー中のキャラとのRelationshipを取得
 * - 最新Conversationの最新2メッセージを取得
 * - 最新メッセージがCHARACTERかつ、ユーザーがまだ返信していない = 未読
 * - proactive未読メッセージも加算（重複排除）
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ count: 0 });

  try {
    const relationships = await prisma.relationship.findMany({
      where: { userId, isFollowing: true },
      select: {
        characterId: true,
        conversations: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          select: {
            messages: {
              take: 2,
              orderBy: { createdAt: 'desc' },
              select: { role: true, createdAt: true },
            },
          },
        },
      },
    });

    let chatUnread = 0;
    for (const rel of relationships) {
      const msgs = rel.conversations?.[0]?.messages ?? [];
      if (msgs.length === 0) continue;

      const latestMsg = msgs[0];
      // 最新メッセージがキャラからの場合 = ユーザーがまだ返信していない
      if (latestMsg.role !== 'USER') {
        chatUnread++;
      }
    }

    // proactive未読（チャットに未表示のもの）
    let proactiveUnread = 0;
    try {
      proactiveUnread = await prisma.characterProactiveMessage.count({
        where: { userId, isRead: false },
      });
    } catch { /* ignore */ }

    // proactiveメッセージはconversationに追加されると上のchatUnreadに含まれるので
    // proactiveの未読がchatUnreadより大きい場合のみ差分を加算
    const total = chatUnread + Math.max(0, proactiveUnread - chatUnread);

    return NextResponse.json({ count: total });
  } catch (error) {
    logger.error('[chat/unread-count] error:', error);
    return NextResponse.json({ count: 0 });
  }
}
