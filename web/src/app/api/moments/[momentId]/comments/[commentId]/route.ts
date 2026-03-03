import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ momentId: string; commentId: string }>;
}

/** DELETE — 自分のコメントを削除 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { commentId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const comment = await prisma.momentComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (comment.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.momentComment.delete({ where: { id: commentId } });

  return NextResponse.json({ deleted: true });
}
