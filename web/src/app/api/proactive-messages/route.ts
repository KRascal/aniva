/**
 * GET /api/proactive-messages
 * ユーザーの未読/有効なキャラ主導メッセージ一覧を返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  try {
    const rawMessages = await prisma.characterProactiveMessage.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: now },
        isExpired: false,
      },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            franchise: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const messages = rawMessages.map((m) => ({
      id: m.id,
      characterId: m.characterId,
      characterName: m.character.name,
      characterAvatarUrl: m.character.avatarUrl,
      characterSlug: m.character.slug,
      content: m.content,
      expiresAt: m.expiresAt.toISOString(),
      remainingMs: m.expiresAt.getTime() - now.getTime(),
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
    }));

    const unreadCount = messages.filter((m) => !m.isRead).length;

    return NextResponse.json({ messages, unreadCount });
  } catch {
    return NextResponse.json({ messages: [], unreadCount: 0 });
  }
}
