/**
 * POST /api/chat/group/pin
 * グループチャットメッセージのピン留め/解除
 *
 * GET /api/chat/group/pin?conversationId=xxx
 * ピン留めメッセージ一覧取得
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, conversationId, action } = await req.json();

    if (!messageId || !conversationId) {
      return NextResponse.json({ error: 'messageId and conversationId required' }, { status: 400 });
    }

    // 会話の所有者確認
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, type: 'group' },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // メッセージ存在確認
    const message = await prisma.message.findFirst({
      where: { id: messageId, conversationId },
    });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // ピン/アンピン: metadata.pinnedフラグで管理
    const currentMetadata = (message.metadata as Record<string, unknown>) ?? {};
    const isPinned = action === 'unpin' ? false : !currentMetadata.pinned;

    await prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: { ...currentMetadata, pinned: isPinned, pinnedAt: isPinned ? new Date().toISOString() : null },
      },
    });

    return NextResponse.json({ success: true, pinned: isPinned });
  } catch (error) {
    logger.error('[GroupChat/Pin] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    // 会話の所有者確認
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, type: 'group' },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // ピン留めメッセージ取得（metadata.pinned = true）
    const pinnedMessages = await prisma.message.findMany({
      where: {
        conversationId,
        metadata: { path: ['pinned'], equals: true },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        content: true,
        role: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ pinnedMessages });
  } catch (error) {
    logger.error('[GroupChat/Pin GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
