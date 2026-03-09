/**
 * POST /api/admin/letters
 * 手紙作成 + FC会員全員に配信
 * GET /api/admin/letters
 * 手紙一覧取得
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const characterId = url.searchParams.get('characterId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const letters = await (prisma as any).characterLetter.findMany({
    where: characterId ? { characterId } : {},
    include: {
      character: { select: { name: true, slug: true } },
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ letters });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as {
    characterId: string;
    title: string;
    content: string;
    imageUrl?: string;
    type?: string;
    isFcOnly?: boolean;
    deliverNow?: boolean;
  };

  const { characterId, title, content, imageUrl, type = 'letter', isFcOnly = true, deliverNow = false } = body;

  if (!characterId || !title || !content) {
    return NextResponse.json({ error: 'characterId, title, content は必須' }, { status: 400 });
  }

  try {
    // 手紙作成
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const letter = await (prisma as any).characterLetter.create({
      data: { characterId, title, content, imageUrl, type, isFcOnly },
    });

    let deliveredCount = 0;

    // 即時配信
    if (deliverNow) {
      // 対象ユーザー取得
      let userIds: string[];
      if (isFcOnly) {
        // FC会員のみ
        const subs = await prisma.characterSubscription.findMany({
          where: { characterId, status: 'ACTIVE' },
          select: { userId: true },
        });
        userIds = [...new Set(subs.map(s => s.userId))];
      } else {
        // 全フォロワー
        const rels = await prisma.relationship.findMany({
          where: { characterId, isFollowing: true },
          select: { userId: true },
        });
        userIds = [...new Set(rels.map(r => r.userId))];
      }

      // LetterDelivery一括作成
      if (userIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).letterDelivery.createMany({
          data: userIds.map(userId => ({ letterId: letter.id, userId })),
          skipDuplicates: true,
        });
        deliveredCount = userIds.length;
      }
    }

    return NextResponse.json({ letter, deliveredCount, ok: true });
  } catch (error) {
    console.error('[admin/letters] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
