/**
 * GET /api/gacha/cards
 * ユーザーの所持カード一覧を返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Guard: check if gacha tables exist
  try {
    await prisma.gachaCard.count();
  } catch {
    return NextResponse.json({ cards: [], total: 0 });
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: {
      card: {
        include: {
          character: { select: { id: true, slug: true, name: true, avatarUrl: true } },
        },
      },
    },
    orderBy: [
      { card: { rarity: 'desc' } },
      { obtainedAt: 'desc' },
    ],
  });

  // レアリティ順ソートの補助マップ
  const rarityOrder: Record<string, number> = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };
  const sorted = [...userCards].sort(
    (a, b) => (rarityOrder[b.card.rarity] ?? 0) - (rarityOrder[a.card.rarity] ?? 0),
  );

  const totalCards = await prisma.gachaCard.count();

  return NextResponse.json({
    cards: sorted.map((uc) => ({
      userCardId: uc.id,
      obtainedAt: uc.obtainedAt,
      card: {
        id: uc.card.id,
        name: uc.card.name,
        description: uc.card.description,
        imageUrl: uc.card.imageUrl,
        rarity: uc.card.rarity,
        category: uc.card.category,
        character: uc.card.character,
      },
    })),
    ownedCount: sorted.length,
    totalCards,
  });
}
