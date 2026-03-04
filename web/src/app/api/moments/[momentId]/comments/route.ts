import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ momentId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { momentId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  try {
    const comments = await prisma.momentComment.findMany({
      where: { momentId },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true, displayName: true, nickname: true, image: true } },
        character: { select: { name: true, slug: true, avatarUrl: true } },
        likes: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        _count: { select: { likes: true } },
      },
    });

    const enriched = comments.map((c) => ({
      ...c,
      likeCount: c._count.likes,
      likedByMe: userId ? (c.likes as { id: string }[]).length > 0 : false,
      likes: undefined,
      _count: undefined,
    }));

    return NextResponse.json({ comments: enriched });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { momentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const content = (body.content ?? '').trim();
  if (!content || content.length > 500) {
    return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
  }
  const comment = await prisma.momentComment.create({
    data: { momentId, userId: session.user.id, content },
    include: {
      user: { select: { id: true, name: true, email: true, displayName: true, nickname: true, image: true } },
      character: { select: { name: true, slug: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ comment: { ...comment, likeCount: 0, likedByMe: false } }, { status: 201 });
}
