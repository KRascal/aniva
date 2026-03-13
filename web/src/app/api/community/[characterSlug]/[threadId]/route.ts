/**
 * /api/community/[characterSlug]/[threadId]
 * スレッド詳細 + 返信
 * GET: スレッド詳細+返信一覧（引用情報含む）
 * POST: 返信投稿（引用・ネストフラット化・通知対応）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterSlug: string; threadId: string }> },
) {
  try {
    const { threadId } = await params;

    const thread = await prisma.fanThread.findUnique({
      where: { id: threadId },
      include: {
        user: { select: { id: true, nickname: true, displayName: true, avatarUrl: true, image: true } },
        character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, nickname: true, displayName: true, avatarUrl: true, image: true } },
            character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
            parent: {
              select: {
                id: true,
                user: { select: { id: true, nickname: true, displayName: true } },
                character: { select: { name: true } },
              },
            },
            quotedReply: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, nickname: true, displayName: true, avatarUrl: true } },
                character: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // View count increment (fire-and-forget)
    prisma.fanThread.update({
      where: { id: threadId },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({
      thread: {
        ...thread,
        author: thread.userId
          ? thread.user
          : { nickname: thread.character.name, avatarUrl: thread.character.avatarUrl, isCharacter: true },
        replies: thread.replies.map(r => ({
          ...r,
          author: r.userId
            ? r.user
            : r.characterId
              ? { nickname: thread.character.name, avatarUrl: thread.character.avatarUrl, isCharacter: true }
              : null,
          quotedReply: r.quotedReply
            ? {
                id: r.quotedReply.id,
                content: r.quotedReply.content,
                createdAt: r.quotedReply.createdAt,
                author: r.quotedReply.user
                  ? r.quotedReply.user
                  : r.quotedReply.character
                    ? { nickname: r.quotedReply.character.name, avatarUrl: r.quotedReply.character.avatarUrl, isCharacter: true }
                    : null,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    logger.error('[Community Thread] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterSlug: string; threadId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterSlug, threadId } = await params;

    const thread = await prisma.fanThread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true, characterId: true, title: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    if (thread.isLocked) {
      return NextResponse.json({ error: 'Thread is locked' }, { status: 403 });
    }

    const { content, parentId: rawParentId, quotedReplyId } = await req.json();

    if (!content || content.length > 2000) {
      return NextResponse.json({ error: 'Content required (max 2000)' }, { status: 400 });
    }

    // 1. parentId のフラット化（2段以上のネスト → 1段目にフラット化）
    let parentId = rawParentId || null;
    if (parentId) {
      const parentReply = await prisma.fanReply.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true },
      });
      if (parentReply?.parentId) {
        parentId = parentReply.parentId;
      }
    }

    // 2. quotedReplyId の検証
    if (quotedReplyId) {
      const quoted = await prisma.fanReply.findUnique({
        where: { id: quotedReplyId, threadId },
        select: { id: true },
      });
      if (!quoted) {
        return NextResponse.json({ error: 'Quoted reply not found' }, { status: 400 });
      }
    }

    // 3. FanReply作成
    const reply = await prisma.fanReply.create({
      data: {
        threadId,
        userId: session.user.id,
        content,
        parentId,
        quotedReplyId: quotedReplyId || null,
      },
    });

    // 4. Update thread reply count and lastReplyAt
    const updatedThread = await prisma.fanThread.update({
      where: { id: threadId },
      data: {
        replyCount: { increment: 1 },
        lastReplyAt: new Date(),
      },
      include: {
        user: { select: { id: true, nickname: true, displayName: true } },
        character: { select: { id: true, name: true, slug: true } },
      },
    });

    const replierName = (session.user as Record<string, unknown>).nickname as string
      || (session.user as Record<string, unknown>).name as string
      || '匿名';

    // 5. 引用通知（quotedReplyIdがある場合）
    if (quotedReplyId) {
      const quotedReply = await prisma.fanReply.findUnique({
        where: { id: quotedReplyId },
        select: { userId: true },
      });
      // 自分自身への引用は通知しない
      if (quotedReply?.userId && quotedReply.userId !== session.user.id) {
        prisma.notification.create({
          data: {
            userId: quotedReply.userId,
            type: 'community_quote',
            title: 'あなたのコメントが引用されました',
            body: `${replierName}さんがあなたのコメントを引用しました`,
            characterId: thread.characterId,
            actorName: replierName,
            targetUrl: `/community/${characterSlug}/${threadId}#reply-${reply.id}`,
          },
        }).catch((e: unknown) => logger.warn('[Notification] community quote:', e));

        // プッシュ通知
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
        fetch(`${baseUrl}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_SECRET || '',
          },
          body: JSON.stringify({
            userId: quotedReply.userId,
            title: 'コメントが引用されました',
            body: `${replierName}さんがあなたのコメントを引用しました`,
            url: `/community/${characterSlug}/${threadId}`,
          }),
        }).catch(() => {});
      }
    }

    // 6. 親コメントへの返信通知（parentIdがある場合）
    if (parentId) {
      const parentReply = await prisma.fanReply.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      // 自分自身への返信 & 引用通知と重複する場合はスキップ
      if (parentReply?.userId
        && parentReply.userId !== session.user.id
        && parentReply.userId !== (quotedReplyId ? (await prisma.fanReply.findUnique({ where: { id: quotedReplyId }, select: { userId: true } }))?.userId : null)
      ) {
        prisma.notification.create({
          data: {
            userId: parentReply.userId,
            type: 'community_reply',
            title: '掲示板で返信がありました',
            body: `${replierName}さんがあなたのコメントに返信しました`,
            characterId: thread.characterId,
            actorName: replierName,
            targetUrl: `/community/${characterSlug}/${threadId}#reply-${reply.id}`,
          },
        }).catch((e: unknown) => logger.warn('[Notification] community reply:', e));
      }
    }

    // 7. スレッド作成者への通知（parentId無し、引用無しの通常返信）
    if (!parentId && !quotedReplyId && updatedThread.userId && updatedThread.userId !== session.user.id) {
      prisma.notification.create({
        data: {
          userId: updatedThread.userId,
          type: 'community_reply',
          title: '掲示板に返信がありました',
          body: `${replierName}さんが「${updatedThread.title?.slice(0, 30)}」に返信しました`,
          characterId: updatedThread.characterId,
          actorName: replierName,
          targetUrl: `/community/${updatedThread.character?.slug || ''}/${threadId}`,
        },
      }).catch((e: unknown) => logger.warn('[Notification] community reply:', e));
    }

    // 8. @メンション通知
    const mentionMatches = content.match(/@(\S+)/g);
    if (mentionMatches) {
      const mentionNames = mentionMatches.map((m: string) => m.slice(1));
      const mentionedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { nickname: { in: mentionNames } },
            { displayName: { in: mentionNames } },
          ],
          id: { not: session.user.id },
        },
        select: { id: true },
      });
      for (const u of mentionedUsers) {
        prisma.notification.create({
          data: {
            userId: u.id,
            type: 'community_mention',
            title: '掲示板でメンションされました',
            body: `${replierName}さんがあなたをメンションしました`,
            characterId: updatedThread.characterId,
            actorName: replierName,
            targetUrl: `/community/${updatedThread.character?.slug || ''}/${threadId}`,
          },
        }).catch((e: unknown) => logger.warn('[Notification] community mention:', e));
      }
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    logger.error('[Community Thread] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
