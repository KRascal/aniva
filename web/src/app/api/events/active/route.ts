import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';

/**
 * GET /api/events/active
 * アクティブなイベント一覧を取得（ユーザー向け）
 * クエリパラメータ: ?characterId=xxx （省略時は全キャラ）
 */
export async function GET(req: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get('characterId');

  const now = new Date();

  const where: Record<string, unknown> = {
    isActive: true,
    startsAt: { lte: now },
    endsAt: { gte: now },
  };
  if (characterId) {
    where.characterId = characterId;
  }

  const events = await prisma.limitedScenario.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { startsAt: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      startsAt: true,
      endsAt: true,
      bannerImage: true,
      rewardCoins: true,
      character: {
        select: { id: true, name: true, slug: true, avatarUrl: true },
      },
    },
  });

  // 残り時間を追加
  const eventsWithMeta = events.map(e => ({
    ...e,
    remainingHours: Math.max(0, Math.round((new Date(e.endsAt).getTime() - now.getTime()) / 3600000)),
    isNew: (now.getTime() - new Date(e.startsAt).getTime()) < 24 * 3600000, // 24h以内に開始
  }));

  return NextResponse.json({ events: eventsWithMeta });
}
