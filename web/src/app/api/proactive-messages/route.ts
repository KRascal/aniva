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
    const messages = await prisma.characterProactiveMessage.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: now },
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

    return NextResponse.json({ messages });
  } catch {
    // DB migration pending
    return NextResponse.json({ messages: [] });
  }
}
