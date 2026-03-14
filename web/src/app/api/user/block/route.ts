import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/user/block — ユーザーをブロック
 * 認証必須、自分自身のブロック禁止
 *
 * body: { blockedId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { blockedId } = body;

    if (!blockedId || typeof blockedId !== 'string') {
      return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
    }

    // 自分自身のブロック禁止
    if (blockedId === userId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // ブロック対象ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // upsert（既にブロック済みでも冪等に動作）
    const block = await prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId,
        },
      },
      update: {},
      create: {
        blockerId: userId,
        blockedId,
      },
    });

    logger.info('User blocked', { blockerId: userId, blockedId });

    return NextResponse.json({ success: true, blockId: block.id }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/user/block error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/user/block — ブロックリスト取得
 * 認証必須
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const cursor = searchParams.get('cursor');

    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = blocks.length > limit;
    const items = hasMore ? blocks.slice(0, limit) : blocks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      blocks: items.map((b) => ({
        id: b.id,
        blockedAt: b.createdAt,
        user: b.blocked,
      })),
      nextCursor,
    });
  } catch (error) {
    logger.error('GET /api/user/block error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/block — ブロック解除
 * 認証必須
 *
 * body: { blockedId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { blockedId } = body;

    if (!blockedId || typeof blockedId !== 'string') {
      return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
    }

    const deleted = await prisma.userBlock.deleteMany({
      where: {
        blockerId: userId,
        blockedId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    logger.info('User unblocked', { blockerId: userId, blockedId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/user/block error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
