import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface GiftReaction {
  text: string;
  emotion: string;
  xpMultiplier: number;
}

export async function generateGiftReaction(
  characterId: string,
  giftType: string,
  giftName: string,
  userId: string
): Promise<GiftReaction> {
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true, slug: true },
    });

    if (!character) {
      return { text: 'ありがとう！', emotion: 'happy', xpMultiplier: 1.0 };
    }

    // characterEngine.generateResponse は relationshipId が必要なため、
    // ギフトリアクション専用に callLLM を直接使用する
    const { callLLM } = await import('@/lib/engine/llm');

    const systemPrompt = `あなたは「${character.name}」というキャラクターです。ユーザーからプレゼントをもらったとき、キャラクターの個性を活かして自然に喜びのリアクションをしてください。返答は50文字以内の短い一言にしてください。`;

    const userPrompt = `ユーザーから「${giftName}」（${giftType}）をプレゼントされました。喜びのリアクションを返してください。`;

    const rawText = await callLLM(systemPrompt, [{ role: 'user', content: userPrompt }]);

    const text = rawText?.trim() || 'ありがとう！嬉しい！';

    const xpMultiplier = giftType === 'premium' ? 2.0 : giftType === 'special' ? 1.5 : 1.0;

    return {
      text,
      emotion: 'happy',
      xpMultiplier,
    };
  } catch (error) {
    logger.error('[GiftReaction] Generation failed:', error);
    return { text: 'ありがとう！', emotion: 'happy', xpMultiplier: 1.0 };
  }
}
