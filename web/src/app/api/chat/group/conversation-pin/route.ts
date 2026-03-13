/**
 * POST /api/chat/group/conversation-pin
 * グループ会話のピン留め/解除
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId, pin } = await req.json() as { conversationId: string; pin: boolean };
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, type: 'group' },
    });
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const currentMeta = (conversation.metadata as Record<string, unknown>) ?? {};
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: {
          ...currentMeta,
          isPinned: pin,
          pinnedAt: pin ? new Date().toISOString() : null,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, isPinned: pin });
  } catch (error) {
    logger.error('[GroupChat/ConversationPin] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
