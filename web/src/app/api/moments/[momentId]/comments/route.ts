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
    // トップレベルコメントのみ取得（parentCommentId = null）
    // repliesはネストして取得
    const comments = await prisma.momentComment.findMany({
      where: { momentId, parentCommentId: null },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true, displayName: true, nickname: true, image: true } },
        character: { select: { name: true, slug: true, avatarUrl: true } },
        likes: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        _count: { select: { likes: true } },
        // ネストされた返信
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, displayName: true, nickname: true, image: true } },
            character: { select: { name: true, slug: true, avatarUrl: true } },
            _count: { select: { likes: true } },
          },
        },
      },
    });

    const enriched = comments.map((c) => ({
      ...c,
      parentCommentId: c.parentCommentId ?? null,
      likeCount: c._count.likes,
      likedByMe: userId ? (c.likes as { id: string }[]).length > 0 : false,
      likes: undefined,
      _count: undefined,
      replies: c.replies.map((r) => ({
        ...r,
        parentCommentId: r.parentCommentId ?? null,
        likeCount: r._count.likes,
        likedByMe: false,
        _count: undefined,
      })),
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
  // parentCommentId: 返信の場合は親コメントIDを受け取る
  const parentCommentId = (body.parentCommentId ?? null) as string | null;

  const comment = await prisma.momentComment.create({
    data: {
      momentId,
      userId: session.user.id,
      content,
      ...(parentCommentId ? { parentCommentId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, displayName: true, nickname: true, image: true } },
      character: { select: { name: true, slug: true, avatarUrl: true } },
    },
  });
  // キャラ返信トリガー（非同期・レスポンスはブロックしない）
  const userDisplay = (session.user as { nickname?: string; displayName?: string; name?: string; email?: string }).nickname
    || (session.user as { displayName?: string }).displayName
    || session.user.name
    || (session.user.email ?? '').split('@')[0]
    || 'ユーザー';

  const baseUrl = req.nextUrl.origin;
  setTimeout(() => {
    fetch(`${baseUrl}/api/chat/comment-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({
        momentId,
        triggerCommentId: comment.id,
        triggerContent: content,
        triggerUserName: userDisplay,
      }),
    }).catch(() => {});
  }, 0);

  return NextResponse.json({
    comment: { ...comment, parentCommentId: comment.parentCommentId ?? null, likeCount: 0, likedByMe: false },
  }, { status: 201 });
}
