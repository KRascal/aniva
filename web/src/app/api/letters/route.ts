/**
 * GET /api/letters
 * FC会員向け手紙一覧取得
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const characterId = url.searchParams.get('characterId');
  const unreadOnly = url.searchParams.get('unread') === 'true';

  try {
    // FC会員であるキャラのIDリスト
    const fcSubs = await prisma.characterSubscription.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { characterId: true },
    });
    const fcCharacterIds = new Set(fcSubs.map(s => s.characterId));

    // 手紙取得（FC会員のキャラ or 非FC公開手紙）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deliveries = await (prisma as any).letterDelivery.findMany({
      where: {
        userId,
        ...(characterId ? { letter: { characterId } } : {}),
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        letter: {
          include: {
            character: {
              select: { id: true, name: true, slug: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // FC未加入者には isFcOnly=true の手紙は届かないが、一応フィルター
    interface LetterDeliveryRow {
      id: string;
      isRead: boolean;
      readAt: Date | null;
      createdAt: Date;
      letter: {
        id: string;
        characterId: string;
        character: { id: string; name: string; slug: string; avatarUrl: string | null };
        title: string;
        content: string;
        imageUrl: string | null;
        type: string;
        isFcOnly: boolean;
      };
    }
    const filtered = (deliveries as LetterDeliveryRow[]).filter((d) =>
      !d.letter.isFcOnly || fcCharacterIds.has(d.letter.characterId)
    );

    return NextResponse.json({
      letters: filtered.map((d) => ({
        id: d.id,
        letterId: d.letter.id,
        character: d.letter.character,
        title: d.letter.title,
        content: d.letter.content,
        imageUrl: d.letter.imageUrl,
        type: d.letter.type,
        isFcOnly: d.letter.isFcOnly,
        isRead: d.isRead,
        readAt: d.readAt,
        createdAt: d.createdAt,
      })),
      unreadCount: filtered.filter((d) => !d.isRead).length,
    });
  } catch (error) {
    logger.error('[letters] error:', error);
    return NextResponse.json({ letters: [], unreadCount: 0 });
  }
}
