import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ momentId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { momentId } = await params;
    const body = await req.json().catch(() => ({}));
    const type = body?.type ?? 'like';

    // momentが存在するか確認
    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { id: true, characterId: true, character: { select: { name: true, avatarUrl: true } } },
    });
    if (!moment) {
      return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
    }

    // 既存のreactionを確認
    const existing = await prisma.reaction.findUnique({
      where: { momentId_userId_type: { momentId, userId, type } },
    });

    let liked: boolean;

    if (existing) {
      // unlike
      await prisma.reaction.delete({
        where: { momentId_userId_type: { momentId, userId, type } },
      });
      liked = false;
    } else {
      // like
      await prisma.reaction.create({
        data: { momentId, userId, type },
      });
      liked = true;

      // ユーザー自身の投稿以外はNotificationに記録しない（キャラの投稿なので不要）
      // ただし将来的にユーザー投稿もあれば記録する
    }

    const reactionCount = await prisma.reaction.count({
      where: { momentId, type },
    });

    return NextResponse.json({ liked, reactionCount });
  } catch (error) {
    logger.error('POST /api/moments/[momentId]/react error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
