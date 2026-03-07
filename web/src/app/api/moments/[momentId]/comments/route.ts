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
            likes: userId
              ? { where: { userId }, select: { id: true } }
              : false,
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
        likedByMe: userId ? ((r as unknown as { likes: { id: string }[] }).likes ?? []).length > 0 : false,
        likes: undefined,
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

  // 返信通知: 親コメントの投稿者にプッシュ通知
  if (parentCommentId) {
    setTimeout(async () => {
      try {
        const parentComment = await prisma.momentComment.findUnique({
          where: { id: parentCommentId },
          select: { userId: true, characterId: true, user: { select: { nickname: true, displayName: true, name: true } } },
        });
        // ユーザーコメントへの返信（自分自身への返信は除外）
        if (parentComment?.userId && parentComment.userId !== session.user.id) {
          const replierName = (comment.character?.name) || userDisplay;
          await fetch(`${baseUrl}/api/push/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.INTERNAL_SECRET || '',
            },
            body: JSON.stringify({
              userId: parentComment.userId,
              title: `${replierName}があなたのコメントに返信しました`,
              body: content.slice(0, 80),
              url: `/moments`,
            }),
          }).catch(() => {});
        }
      } catch {
        // 通知失敗は無視
      }
    }, 0);
  }

  // fire & forget — ユーザー返答してすぐ、非同期でキャラが返信
  const triggerCharacterReply = async () => {
    try {
      // momentの情報と投稿主キャラを取得
      const momentWithChar = await prisma.moment.findUnique({
        where: { id: momentId },
        select: {
          id: true,
          content: true,
          character: { select: { id: true, name: true, systemPrompt: true } },
        },
      });
      if (!momentWithChar?.character) return;

      const ownerChar = momentWithChar.character;
      const userName = session.user.name || 'ユーザー';

      // LLMでキャラ返信を生成
      const xaiKey = process.env.XAI_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;

      let replyContent = '';
      if (xaiKey) {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.LLM_MODEL || 'grok-3-mini',
            messages: [
              { role: 'system', content: `${(ownerChar.systemPrompt || '').split(/\n##/)[0].trim()}\n\n重要: 自分の投稿へのコメントへの返信として自然な1〜2文のみ出力。口調ルールは出力しない。` },
              { role: 'user', content: `${userName}が「${content.slice(0, 100)}」とコメントしてくれた。${ownerChar.name}らしく短く返信してください。` },
            ],
            max_tokens: 100,
            temperature: 0.9,
          }),
        });
        const data = await res.json();
        replyContent = data.choices?.[0]?.message?.content?.trim() || '';
      } else if (anthropicKey) {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: anthropicKey });
        const response = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 100,
          system: `${(ownerChar.systemPrompt || '').split(/\n##/)[0].trim()}\n\n重要: 投稿へのコメントへの返信として自然な1〜2文のみ出力。`,
          messages: [{ role: 'user', content: `${userName}が「${content.slice(0, 100)}」とコメントしてくれた。${ownerChar.name}らしく短く返信してください。` }],
        });
        replyContent = (response.content[0] as { text: string }).text?.trim() || '';
      }

      if (!replyContent) return;

      // 3-10秒ランダム遅延（自然に見せる）
      const delay = 3000 + Math.random() * 7000;
      await new Promise(r => setTimeout(r, delay));

      await prisma.momentComment.create({
        data: {
          momentId,
          characterId: ownerChar.id,
          userId: null,
          content: replyContent.slice(0, 200),
          parentCommentId: comment.id,
        },
      });

      // Notificationに記録
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'character_reply',
          title: `${ownerChar.name}があなたのコメントに返信しました`,
          body: replyContent.slice(0, 80),
          momentId,
          characterId: ownerChar.id,
          actorName: ownerChar.name,
          targetUrl: `/moments`,
        },
      });

      // push通知
      fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET || '' },
        body: JSON.stringify({
          userId: session.user.id,
          title: `${ownerChar.name}が返信しました`,
          body: replyContent.slice(0, 80),
          url: '/moments',
        }),
      }).catch(() => {});
    } catch (err) {
      console.error('Character auto-reply error:', err);
    }
  };
  triggerCharacterReply(); // fire & forget

  return NextResponse.json({
    comment: { ...comment, parentCommentId: comment.parentCommentId ?? null, likeCount: 0, likedByMe: false },
  }, { status: 201 });
}
