import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface ChoiceItem {
  text: string;
  consequence: string;
  nextTease?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await params;
    const body = await req.json();
    const { chapterId, choiceIndex } = body as { chapterId: string; choiceIndex: number };

    if (!chapterId || choiceIndex === undefined) {
      return NextResponse.json({ error: 'Missing chapterId or choiceIndex' }, { status: 400 });
    }

    // チャプター取得
    const chapter = await prisma.storyChapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter || chapter.characterId !== characterId) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const choices = (chapter.choices as unknown as ChoiceItem[]) ?? [];
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return NextResponse.json({ error: 'Invalid choiceIndex' }, { status: 400 });
    }

    const selectedChoice = choices[choiceIndex];
    const consequence = selectedChoice.consequence;

    // UserStoryProgress を upsert
    const existingProgress = await prisma.userStoryProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
    });

    const prevChoices = (existingProgress?.choicesMade ?? []) as { choiceIndex: number; consequence: string; selectedAt: string }[];
    const newChoices = [
      ...prevChoices,
      {
        choiceIndex,
        consequence,
        selectedAt: new Date().toISOString(),
      },
    ];

    await prisma.userStoryProgress.upsert({
      where: { userId_chapterId: { userId, chapterId } },
      create: {
        userId,
        characterId,
        chapterId,
        choicesMade: newChoices,
        isCompleted: true,
        completedAt: new Date(),
      },
      update: {
        choicesMade: newChoices,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Relationship の memorySummary にストーリーの選択を追記
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
    });

    if (relationship) {
      type MemorySummaryData = Record<string, unknown>;
      const memo = (relationship.memorySummary ?? {}) as MemorySummaryData;

      // story_choices フィールドに consequence を追記（最大20件）
      const storyChoices = (memo.story_choices as string[] | undefined) ?? [];
      const storyNote = `ストーリー選択(Ch${chapter.chapterNumber}「${chapter.title}」): ${consequence}`;
      const updatedChoices = [...storyChoices, storyNote].slice(-20);

      // character-engine が次回注入できるよう story_context にも保存
      const storyContext = (memo.story_context as string | undefined) ?? '';
      const newContext =
        storyContext
          ? `${storyContext}\n${storyNote}`
          : storyNote;

      await prisma.relationship.update({
        where: { id: relationship.id },
        data: {
          memorySummary: {
            ...memo,
            story_choices: updatedChoices,
            story_context: newContext.slice(-1000), // 最大1000文字
          },
        },
      });
    }

    // XP付与（選択肢ごとに5-20XP、二重付与防止）
    const isFirstCompletion = !existingProgress?.isCompleted;
    let xpEarned = 0;
    let coinsEarned = 0;

    if (isFirstCompletion && relationship) {
      // 選択肢のXP（チャプター難易度 = chapterNumber * 3 + base 10）
      xpEarned = Math.min(10 + chapter.chapterNumber * 3, 30);

      // チャプター完了コイン報酬（基本5コイン + チャプター番号ボーナス）
      coinsEarned = 5 + Math.floor(chapter.chapterNumber / 3) * 5;

      // XP付与
      await prisma.relationship.update({
        where: { id: relationship.id },
        data: {
          experiencePoints: { increment: xpEarned },
        },
      });

      // コイン付与（CoinBalanceモデルへのupsert）
      await prisma.coinBalance.upsert({
        where: { userId },
        create: {
          userId,
          balance: coinsEarned,
          freeBalance: coinsEarned,
          paidBalance: 0,
        },
        update: {
          balance: { increment: coinsEarned },
          freeBalance: { increment: coinsEarned },
        },
      });
    }

    return NextResponse.json({
      success: true,
      consequence,
      nextTease: selectedChoice.nextTease ?? null,
      rewards: isFirstCompletion ? { xpEarned, coinsEarned } : null,
    });
  } catch (error) {
    logger.error('Story choice POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
