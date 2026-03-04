import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDailyEmotionForEngine } from '@/lib/character-engine';

/**
 * GET /api/characters/[characterId]/daily-state
 * 今日のキャラクターの感情状態を返す。未生成の場合はその場で生成する。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await params;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日のCharacterDailyStateを取得
    let dailyState = await prisma.characterDailyState.findUnique({
      where: { characterId_date: { characterId, date: today } },
      select: {
        emotion: true,
        context: true,
        bonusXpMultiplier: true,
      },
    });

    // 未生成の場合はその場で生成
    if (!dailyState) {
      // キャラクターが存在するか確認
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: { id: true },
      });
      if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
      }

      const generated = generateDailyEmotionForEngine(new Date());
      dailyState = await prisma.characterDailyState.create({
        data: {
          characterId,
          date: today,
          emotion: generated.emotion,
          context: generated.context,
          bonusXpMultiplier: generated.bonusXpMultiplier,
        },
        select: {
          emotion: true,
          context: true,
          bonusXpMultiplier: true,
        },
      });
    }

    return NextResponse.json({
      emotion: dailyState.emotion,
      context: dailyState.context,
      bonusXpMultiplier: dailyState.bonusXpMultiplier,
      isBonus: dailyState.bonusXpMultiplier > 1.0,
    });
  } catch (error) {
    console.error('[daily-state API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
