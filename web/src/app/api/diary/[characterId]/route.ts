import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await auth();
  const { characterId: characterIdOrSlug } = await params;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '10', 10)));
  const skip = (page - 1) * limit;
  const userId = session?.user?.id;

  // slugとidの両方に対応（exploreからslugで遷移する場合がある）
  let characterId = characterIdOrSlug;
  const isCuid = /^c[a-z0-9]{20,}$/i.test(characterIdOrSlug);
  if (!isCuid) {
    const char = await prisma.character.findFirst({
      where: { slug: characterIdOrSlug, isActive: true },
      select: { id: true },
    });
    if (char) characterId = char.id;
  }

  try {
    const [diaries, total] = await Promise.all([
      prisma.characterDiary.findMany({
        where: { characterId },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          characterId: true,
          date: true,
          content: true,
          mood: true,
          imageUrl: true,
          likes: true,
          createdAt: true,
          diaryLikes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
      }),
      prisma.characterDiary.count({ where: { characterId } }),
    ]);

    const diariesWithLiked = diaries.map((d) => ({
      id: d.id,
      characterId: d.characterId,
      date: d.date,
      content: d.content,
      mood: d.mood,
      imageUrl: d.imageUrl,
      likes: d.likes,
      createdAt: d.createdAt,
      isLiked: Array.isArray(d.diaryLikes) ? d.diaryLikes.length > 0 : false,
    }));

    return NextResponse.json({
      diaries: diariesWithLiked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[diary GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
