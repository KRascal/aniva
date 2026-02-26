import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  // ?q= または ?search= でキャラ名の部分一致検索
  const q = req.nextUrl.searchParams.get('q') ?? req.nextUrl.searchParams.get('search');

  const where: Prisma.CharacterWhereInput = { isActive: true };
  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q.trim(), mode: 'insensitive' } },
      { nameEn: { contains: q.trim(), mode: 'insensitive' } },
      { franchise: { contains: q.trim(), mode: 'insensitive' } },
    ];
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

  const enriched = characters
    .map(c => ({
      ...c,
      followerCount: c._count.relationships,
      _count: undefined,
    }))
    // 人気順（フォロワー数降順）→ 同数なら名前順
    .sort((a, b) => (b.followerCount - a.followerCount) || a.name.localeCompare(b.name, 'ja'));

  return NextResponse.json({ characters: enriched });
}
