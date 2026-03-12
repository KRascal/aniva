import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ characterId: string; diaryId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { diaryId } = await params;

  try {
    const diary = await prisma.characterDiary.findUnique({
      where: { id: diaryId },
      select: { id: true, likes: true },
    });

    if (!diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    const existing = await prisma.characterDiaryLike.findUnique({
      where: {
        userId_diaryId: { userId, diaryId },
      },
    });

    let liked: boolean;
    let newLikes: number;

    if (existing) {
      // いいね解除
      await prisma.characterDiaryLike.delete({
        where: { userId_diaryId: { userId, diaryId } },
      });
      newLikes = Math.max(0, diary.likes - 1);
      await prisma.characterDiary.update({
        where: { id: diaryId },
        data: { likes: newLikes },
      });
      liked = false;
    } else {
      // いいね追加
      await prisma.characterDiaryLike.create({
        data: { userId, diaryId },
      });
      newLikes = diary.likes + 1;
      await prisma.characterDiary.update({
        where: { id: diaryId },
        data: { likes: newLikes },
      });
      liked = true;
    }

    return NextResponse.json({ liked, likes: newLikes });
  } catch (error) {
    logger.error('[diary like POST] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
