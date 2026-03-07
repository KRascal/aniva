import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications — タイムライン特化通知一覧
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ notifications: [] });

  try {
    const raw = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // actorAvatarが未設定の通知にcharacterIdからアバターを補完
    const missingAvatarIds = raw
      .filter((n) => !n.actorAvatar && n.characterId)
      .map((n) => n.characterId as string);

    let charMap: Record<string, string | null> = {};
    if (missingAvatarIds.length > 0) {
      const chars = await prisma.character.findMany({
        where: { id: { in: [...new Set(missingAvatarIds)] } },
        select: { id: true, avatarUrl: true },
      });
      charMap = Object.fromEntries(chars.map((c) => [c.id, c.avatarUrl]));
    }

    const notifications = raw.map((n) => ({
      ...n,
      actorAvatar: n.actorAvatar || (n.characterId ? charMap[n.characterId] ?? null : null),
    }));

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}

// POST /api/notifications/read-all — 全件既読
export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ ok: false });

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
