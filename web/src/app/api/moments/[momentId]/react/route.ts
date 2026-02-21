import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ momentId: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { momentId } = await params;
    const body = await req.json();
    const type = body?.type ?? 'like';

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
    }

    const reactionCount = await prisma.reaction.count({
      where: { momentId, type },
    });

    return NextResponse.json({ liked, reactionCount });
  } catch (error) {
    console.error('POST /api/moments/[momentId]/react error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
