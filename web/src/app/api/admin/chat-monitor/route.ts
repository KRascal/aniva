import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get('characterId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200);

    // Build date filters on Message.createdAt
    const createdAtFilter: Record<string, Date> = {};
    if (from) createdAtFilter.gte = new Date(from);
    if (to) createdAtFilter.lte = new Date(to);

    // Filter conversation via relationship → character/user
    const conversationWhere: Record<string, unknown> = {};
    if (characterId || userId) {
      conversationWhere.relationship = {
        ...(characterId ? { characterId } : {}),
        ...(userId ? { userId } : {}),
      };
    }

    const messages = await prisma.message.findMany({
      where: {
        ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
        role: { not: 'SYSTEM' },
        conversation: conversationWhere,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        conversation: {
          include: {
            relationship: {
              include: {
                character: { select: { id: true, name: true, avatarUrl: true } },
                user: { select: { id: true, email: true, displayName: true } },
              },
            },
          },
        },
      },
    });

    // Gather character/user filter lists
    const [characters, users] = await Promise.all([
      prisma.character.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        select: { id: true, email: true, displayName: true },
        orderBy: { email: 'asc' },
        take: 500,
      }),
    ]);

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        conversationId: m.conversationId,
        character: m.conversation.relationship?.character,
        user: {
          id: m.conversation.relationship?.user.id,
          email: m.conversation.relationship?.user.email,
          displayName: m.conversation.relationship?.user.displayName,
        },
      })),
      filters: {
        characters,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
        })),
      },
    });
  } catch (error) {
    logger.error('[admin/chat-monitor] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
