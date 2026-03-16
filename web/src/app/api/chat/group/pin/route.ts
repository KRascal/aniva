/**
 * グループチャット ピン留め API
 * POST /api/chat/group/pin
 * body: { conversationId: string, pin: boolean }
 *
 * Conversation.metadata に isPinned / pinnedAt を保存
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

    const body = await req.json() as { conversationId?: string; pin?: boolean };
    const { conversationId, pin } = body;

    if (!conversationId || typeof pin !== 'boolean') {
      return NextResponse.json({ error: 'conversationId and pin are required' }, { status: 400 });
    }

    // 所有確認
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const existingMeta = (conv.metadata ?? {}) as Record<string, unknown>;
    const updatedMeta = {
      ...existingMeta,
      isPinned: pin,
      pinnedAt: pin ? new Date().toISOString() : null,
    };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: updatedMeta },
    });

    return NextResponse.json({ success: true, isPinned: pin });
  } catch (error) {
    logger.error('[GroupChat Pin] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
