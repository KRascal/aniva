import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ relationshipId: string }> }
) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { relationshipId } = await params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before');

    // IDOR防止: relationshipのオーナーチェック
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      select: { userId: true },
    });
    if (!relationship || relationship.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [], hasMore: false });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const result = messages.slice(0, limit).reverse();

    return NextResponse.json({
      messages: result,
      hasMore,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
