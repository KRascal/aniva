import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ commentId: string }>;
}

/** POST — いいね追加 / DELETE — いいね削除 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { commentId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.commentLike.create({
      data: { commentId, userId },
    });
  } catch {
    // Already liked (unique constraint)
    return NextResponse.json({ liked: true, message: 'Already liked' });
  }

  const count = await prisma.commentLike.count({ where: { commentId } });
  return NextResponse.json({ liked: true, likeCount: count }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { commentId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.commentLike.deleteMany({
    where: { commentId, userId },
  });

  const count = await prisma.commentLike.count({ where: { commentId } });
  return NextResponse.json({ liked: false, likeCount: count });
}
