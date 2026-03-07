import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/moments/[momentId]/comments/[commentId]/like
 * コメントいいねのトグル（CommentLikeテーブル使用）
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ momentId: string; commentId: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await params;

    // コメント存在確認
    const comment = await prisma.momentComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // 既存いいね確認
    const existing = await prisma.commentLike.findFirst({
      where: { commentId, userId },
    });

    let liked: boolean;
    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.commentLike.create({
        data: { commentId, userId },
      });
      liked = true;
    }

    const likeCount = await prisma.commentLike.count({
      where: { commentId },
    });

    return NextResponse.json({ liked, likeCount });
  } catch (error) {
    console.error('Comment like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
