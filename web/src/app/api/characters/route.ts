import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthUserId } from '@/lib/api-auth';
import { cacheGet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache';

/** DBからキャラ一覧を取得し、人気順でソートして返す（キャッシュ対象の共通処理） */
async function fetchCharacters(where: Prisma.CharacterWhereInput) {
  const characters = await prisma.character.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      franchise: true,
      franchiseEn: true,
      description: true,
      avatarUrl: true,
      coverUrl: true,
      catchphrases: true,
      birthday: true,
      voiceModelId: true,
      _count: {
        select: {
          relationships: {
            where: { isFollowing: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return characters
    .map(c => ({
      ...c,
      followerCount: c._count.relationships,
      _count: undefined,
    }))
    .sort((a, b) => (b.followerCount - a.followerCount) || a.name.localeCompare(b.name, 'ja'));
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? req.nextUrl.searchParams.get('search');
    const followingOnly = req.nextUrl.searchParams.get('followingOnly') === 'true';
    const excludeFollowing = req.nextUrl.searchParams.get('excludeFollowing') === 'true';
    const limitParam = req.nextUrl.searchParams.get('limit');
    const randomParam = req.nextUrl.searchParams.get('random');

    // ユーザー固有フィルタがある場合はキャッシュ不可（DB直アクセス）
    const isUserSpecific = followingOnly || excludeFollowing;

    const where: Prisma.CharacterWhereInput = { isActive: true };
    if (q && q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
        { franchise: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    let enriched: Awaited<ReturnType<typeof fetchCharacters>>;

    if (isUserSpecific) {
      // フォロー系フィルタ: キャッシュなしでDB直アクセス
      if (followingOnly) {
        const userId = await getAuthUserId(req);
        if (userId) {
          where.relationships = { some: { userId, isFollowing: true } };
        } else {
          return NextResponse.json({ characters: [] });
        }
      }
      if (excludeFollowing) {
        const userId = await getAuthUserId(req);
        if (userId) {
          const followedRels = await prisma.relationship.findMany({
            where: { userId, isFollowing: true },
            select: { characterId: true },
          });
          const followedCharacterIds = followedRels.map(r => r.characterId);
          if (followedCharacterIds.length > 0) {
            where.id = { notIn: followedCharacterIds };
          }
        }
      }
      enriched = await fetchCharacters(where);
    } else {
      // キャッシュ可能: 検索クエリの有無でキーを分ける
      const cacheKey = q && q.trim()
        ? CACHE_KEYS.charactersSearch(q)
        : CACHE_KEYS.CHARACTERS_LIST;
      enriched = await cacheGet(cacheKey, CACHE_TTL.CHARACTERS, () => fetchCharacters(where));
    }

    // ?random=1 → シャッフル（キャッシュ後に適用）
    if (randomParam === '1') {
      enriched = [...enriched].sort(() => Math.random() - 0.5);
    }

    // ?limit=N → 件数制限
    if (limitParam) {
      const limit = Math.max(1, Math.min(100, parseInt(limitParam, 10) || 100));
      enriched = enriched.slice(0, limit);
    }

    return NextResponse.json({ characters: enriched });
  } catch (error) {
    console.error('[characters] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
