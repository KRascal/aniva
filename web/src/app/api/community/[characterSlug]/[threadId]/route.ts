/**
 * /api/community/[characterSlug]/[threadId]
 * スレッド詳細 + 返信
 * GET: スレッド詳細+返信一覧
 * POST: 返信投稿
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        author: thread.userId ? thread.user : { nickname: thread.character.name, avatarUrl: thread.character.avatarUrl, isCharacter: true },
        replies: thread.replies.map(r => ({
          ...r,
          author: r.userId
            ? r.user
            : r.characterId
              ? { nickname: thread.character.name, avatarUrl: thread.character.avatarUrl, isCharacter: true }
              : null,
        })),
      },
    });
  } catch (error) {
    console.error('[Community Thread] GET error:', error);
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

    const { threadId } = await params;

    const thread = await prisma.fanThread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    if (thread.isLocked) {
      return NextResponse.json({ error: 'Thread is locked' }, { status: 403 });
    }

    const { content, parentId } = await req.json();

    if (!content || content.length > 2000) {
      return NextResponse.json({ error: 'Content required (max 2000)' }, { status: 400 });
    }

    const reply = await prisma.fanReply.create({
      data: {
        threadId,
        userId: session.user.id,
        content,
        parentId: parentId || null,
      },
    });

    // Update thread reply count and lastReplyAt
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

    // Notify thread author about the reply (skip if replying to own thread)
    if (updatedThread.userId && updatedThread.userId !== session.user.id) {
      const replierName = (session.user as Record<string, unknown>).nickname as string
        || (session.user as Record<string, unknown>).name as string
        || '匿名';
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
      }).catch((e: unknown) => console.warn('[Notification] community reply:', e));
    }

    // Also notify users mentioned with @ in the content
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
      const replierName = (session.user as Record<string, unknown>).nickname as string
        || (session.user as Record<string, unknown>).name as string
        || '匿名';
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
        }).catch((e: unknown) => console.warn('[Notification] community mention:', e));
      }
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error('[Community Thread] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
