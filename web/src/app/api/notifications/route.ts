/**
 * GET /api/notifications
 * ユーザーへの通知一覧を返す
 * Notificationモデルがない場合はProactiveMessageで代替
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ notifications: [] });

  try {
    // Notificationモデルがあれば使う、なければ空
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasModel = !!(prisma as any).notification;
    if (hasModel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notifications = await (prisma as any).notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ notifications });
    }

    // フォールバック: proactiveメッセージを通知として返す
    const proactive = await prisma.characterProactiveMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { character: { select: { name: true, avatarUrl: true, slug: true } } },
    });

    const notifications = proactive.map(p => ({
      id: p.id,
      type: 'character_message',
      message: `${p.character.name}からメッセージが届いています: 「${p.content.slice(0, 40)}${p.content.length > 40 ? '…' : ''}」`,
      createdAt: p.createdAt.toISOString(),
      isRead: p.isRead,
      actorName: p.character.name,
      actorAvatar: p.character.avatarUrl,
      targetUrl: `/chat/${p.character.slug}`,
    }));

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
