import { logger } from './logger';
import { prisma } from './prisma';

interface GiftPreferences {
  favorites: string[]; // 好物ギフトID: ["meat", "sake"]
  dislikes: string[]; // 苦手ギフトID: ["flower"]
}

/**
 * キャラのギフト好みを取得
 * Character.personalityTraits (Json) から giftPreferences を抽出
 * 例: personalityTraits = { giftPreferences: { favorites: ["meat"], dislikes: ["flower"] } }
 */
async function getGiftPreferences(characterId: string): Promise<GiftPreferences | null> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { personalityTraits: true },
  });
  if (!character) return null;

  const traits = character.personalityTraits as Record<string, unknown> | unknown[] | null;
  // personalityTraits は配列またはオブジェクト形式の可能性がある
  if (Array.isArray(traits)) return null;
  const traitsObj = traits as Record<string, unknown> | null;
  if (!traitsObj?.giftPreferences) return null;
  return traitsObj.giftPreferences as GiftPreferences;
}

/**
 * ギフトのXP倍率を取得
 * 好物→1.5x, 苦手→0.8x, 通常→1.0x
 */
export async function getGiftMultiplier(characterId: string, giftType: string): Promise<number> {
  const prefs = await getGiftPreferences(characterId);
  if (!prefs) return 1.0;
  if (prefs.favorites.includes(giftType)) return 1.5;
  if (prefs.dislikes.includes(giftType)) return 0.8;
  return 1.0;
}

/**
 * AI生成リアクション
 * キャラのsystemPromptを使って、ギフトに対する1行リアクションをLLM生成
 * 失敗時はデフォルトreactionにフォールバック
 */
export async function generateGiftReaction(
  characterId: string,
  characterName: string,
  giftName: string,
  giftEmoji: string,
  defaultReaction: string,
  userName: string,
): Promise<string> {
  try {
    // キャラのsystemPromptを取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { systemPrompt: true, name: true },
    });
    if (!character?.systemPrompt) return defaultReaction;

    // 好物/苦手を取得
    const prefs = await getGiftPreferences(characterId);
    let giftContext = '';
    if (prefs?.favorites.some((f) => giftName.toLowerCase().includes(f))) {
      giftContext = 'これはあなたの大好物です。特別に喜んでください。';
    } else if (prefs?.dislikes.some((d) => giftName.toLowerCase().includes(d))) {
      giftContext = 'これはあなたが少し苦手なものです。困りつつも受け取ってください。';
    }

    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) return defaultReaction;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini-fast',
        messages: [
          {
            role: 'system',
            content: `${character.systemPrompt}\n\nあなたは${character.name}です。ユーザーからギフトを受け取りました。キャラクターとして自然な1行リアクション（30文字以内）を返してください。口調・性格を完全に維持すること。`,
          },
          {
            role: 'user',
            content: `${userName}から「${giftName}${giftEmoji}」をもらいました。${giftContext}\nリアクション:`,
          },
        ],
        max_tokens: 60,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return defaultReaction;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.length > 100) return defaultReaction;
    return content;
  } catch (error) {
    logger.warn('[GiftReaction] AI generation failed, using default:', error);
    return defaultReaction;
  }
}
