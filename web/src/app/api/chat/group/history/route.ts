/**
 * GET /api/chat/group/history?conversationId=...&limit=30
 * グループチャットの会話履歴を取得する
 * 認証済みユーザーの会話のみ返す（IDOR対策）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 100);

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // IDOR対策: 会話がユーザーに属していることを確認（グループ=userId直接、1on1=relationship経由）
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        userId: true,
        metadata: true,
        relationship: {
          select: { userId: true },
        },
      },
    });

    const ownerUserId = conversation?.userId ?? conversation?.relationship?.userId;
    if (!conversation || ownerUserId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    const meta = conversation.metadata as { characterIds?: string[] };
    return NextResponse.json({
      conversationId,
      messages,
      characterIds: meta?.characterIds ?? [],
    });
  } catch (error) {
    logger.error('[GroupChat/History] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
