import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/story
 * 全キャラのストーリー進捗サマリーを返す
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // フォロー中のキャラのみ取得
    const followedRelationships = await prisma.relationship.findMany({
      where: { userId, isFollowing: true },
      select: { characterId: true },
    });
    const followedIds = followedRelationships.map(r => r.characterId);

    const characters = await prisma.character.findMany({
      where: { isActive: true, id: { in: followedIds.length > 0 ? followedIds : ['__none__'] } },
      select: {
        id: true,
        name: true,
        slug: true,
        franchise: true,
        avatarUrl: true,
        catchphrases: true,
        _count: {
          select: { storyChapters: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (characters.length === 0) {
      return NextResponse.json({ characters: [] });
    }

    const characterIds = characters.map((c) => c.id);

    // ユーザーの完了済みチャプター数を一括取得
    const userProgress = await prisma.userStoryProgress.groupBy({
      by: ['characterId'],
      where: { userId, characterId: { in: characterIds }, isCompleted: true },
      _count: { id: true },
    });

    const progressMap = new Map(
      userProgress.map((p) => [p.characterId, p._count.id]),
    );

    // 各キャラのリレーションシップレベルを一括取得
    const relationships = await prisma.relationship.findMany({
      where: { userId, characterId: { in: characterIds } },
      select: { characterId: true, level: true },
    });
    const levelMap = new Map(relationships.map((r) => [r.characterId, r.level]));

    const result = characters
      .filter((c) => c._count.storyChapters > 0) // チャプターが存在するキャラのみ
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        franchise: c.franchise,
        avatarUrl: c.avatarUrl,
        catchphrase: c.catchphrases[0] ?? null,
        totalChapters: c._count.storyChapters,
        completedChapters: progressMap.get(c.id) ?? 0,
        userLevel: levelMap.get(c.id) ?? 1,
      }));

    return NextResponse.json({ characters: result });
  } catch (error) {
    console.error('[story] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
