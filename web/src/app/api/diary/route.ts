/**
 * GET /api/diary
 * 全キャラクターの日記を日付降順で返す（タイムライン用）
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const skip = (page - 1) * limit;

  try {
    const [diaries, total] = await Promise.all([
      prisma.characterDiary.findMany({
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
          character: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatarUrl: true,
              franchise: true,
            },
          },
          diaryLikes: userId
            ? { where: { userId }, select: { id: true } }
            : false,
        },
      }),
      prisma.characterDiary.count(),
    ]);

    const result = diaries.map((d) => ({
      id: d.id,
      characterId: d.characterId,
      date: d.date,
      content: d.content,
      mood: d.mood,
      imageUrl: d.imageUrl,
      likes: d.likes,
      createdAt: d.createdAt,
      character: d.character,
      isLiked: Array.isArray(d.diaryLikes) ? d.diaryLikes.length > 0 : false,
    }));

    return NextResponse.json({
      diaries: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[diary/all GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
