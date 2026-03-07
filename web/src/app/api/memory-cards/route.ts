import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      type: 'MILESTONE',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      body: true,
      characterId: true,
      createdAt: true,
    },
  });

  // キャラクター情報を付与
  const charIds = [...new Set(notifications.map(n => n.characterId).filter(Boolean))] as string[];
  const characters = charIds.length > 0
    ? await prisma.character.findMany({
        where: { id: { in: charIds } },
        select: { id: true, name: true, avatarUrl: true },
      })
    : [];
  const charMap = new Map(characters.map(c => [c.id, c]));

  const cards = notifications.map(n => ({
    ...n,
    character: n.characterId ? charMap.get(n.characterId) ?? null : null,
  }));

  return NextResponse.json({ cards });
}
