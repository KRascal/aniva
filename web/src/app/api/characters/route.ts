import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthUserId } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    // ?q= または ?search= でキャラ名の部分一致検索
    const q = req.nextUrl.searchParams.get('q') ?? req.nextUrl.searchParams.get('search');
    const followingOnly = req.nextUrl.searchParams.get('followingOnly') === 'true';
    const limitParam = req.nextUrl.searchParams.get('limit');
    const randomParam = req.nextUrl.searchParams.get('random');

    const where: Prisma.CharacterWhereInput = { isActive: true };
    if (q && q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
        { franchise: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    // フォロー中のみフィルタ
    if (followingOnly) {
      const userId = await getAuthUserId(req);
      if (userId) {
        where.relationships = {
          some: { userId, isFollowing: true },
        };
      } else {
        // 未認証時はフォロー中キャラなし → 空を返す
        return NextResponse.json({ characters: [] });
      }
    }

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

    let enriched = characters
      .map(c => ({
        ...c,
        followerCount: c._count.relationships,
        _count: undefined,
      }))
      // 人気順（フォロワー数降順）→ 同数なら名前順
      .sort((a, b) => (b.followerCount - a.followerCount) || a.name.localeCompare(b.name, 'ja'));

    // ?random=1 → シャッフル
    if (randomParam === '1') {
      enriched = enriched.sort(() => Math.random() - 0.5);
    }

    // ?limit=N → 件数制限（サーバーサイド）
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
