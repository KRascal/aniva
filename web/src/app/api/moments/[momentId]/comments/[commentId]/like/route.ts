import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/moments/[momentId]/comments/[commentId]/like
 * コメントいいねのトグル + 通知生成
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ momentId: string; commentId: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const userName = session?.user?.name || 'ユーザー';
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { momentId, commentId } = await params;

    const comment = await prisma.momentComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, content: true },
    });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const existing = await prisma.commentLike.findFirst({
      where: { commentId, userId },
    });

    let liked: boolean;
    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.commentLike.create({ data: { commentId, userId } });
      liked = true;

      // 自分以外のコメント投稿者に通知
      if (comment.userId && comment.userId !== userId) {
        prisma.notification.create({
          data: {
            userId: comment.userId,
            type: 'comment_like',
            title: `${userName}があなたのコメントにいいねしました`,
            body: comment.content?.slice(0, 80) || '',
            momentId,
            actorName: userName,
            targetUrl: `/moments?highlight=${momentId}`,
          },
        }).catch(() => {});

        // push通知
        const baseUrl = `http://localhost:${process.env.PORT || '3061'}`;
        fetch(`${baseUrl}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET || '' },
          body: JSON.stringify({
            userId: comment.userId,
            title: `${userName}がいいねしました`,
            body: comment.content?.slice(0, 60) || '',
            url: '/moments',
          }),
        }).catch(() => {});
      }
    }

    const likeCount = await prisma.commentLike.count({ where: { commentId } });
    return NextResponse.json({ liked, likeCount });
  } catch (error) {
    logger.error('Comment like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
