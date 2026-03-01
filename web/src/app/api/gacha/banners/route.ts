/**
 * GET /api/gacha/banners
 * アクティブなバナー一覧 + 所持カード数
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFreeGachaAvailable } from '@/lib/gacha-system';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();

  const banners = await prisma.gachaBanner.findMany({
    where: {
      isActive: true,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    orderBy: { startAt: 'desc' },
  });

  const myCardCount = await prisma.userCard.count({ where: { userId } });
  const freeGachaAvailable = await getFreeGachaAvailable(userId);

  return NextResponse.json({ banners, myCardCount, freeGachaAvailable });
}
