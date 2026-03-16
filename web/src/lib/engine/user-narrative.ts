/**
 * ユーザーナラティブサマリー生成エンジン
 * 直近の会話履歴とメモリから「この人がどんな人か」を物語として要約する
 *
 * 体験品質 #2: ユーザーナラティブサマリー（USER.md方式）
 */

import { prisma } from '../prisma';
import { logger } from '../logger';

const XAI_API_ENDPOINT = 'https://api.x.ai/v1';
const XAI_MODEL = 'grok-3-mini';

/**
 * xAI APIを呼び出してテキストを生成する
 */
async function callXAI(systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not set');
  }

  const response = await fetch(`${XAI_API_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('xAI API returned empty content');
  }
  return content.trim();
}

/**
 * relationshipIdからユーザーナラティブサマリーを生成してDBに保存する
 * エラー時はサイレントに無視（既存動作を壊さない）
 */
export async function generateNarrative(relationshipId: string): Promise<void> {
  try {
    // Relationshipを取得
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      select: {
        id: true,
        memorySummary: true,
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!relationship) {
      logger.warn(`[generateNarrative] Relationship not found: ${relationshipId}`);
      return;
    }

    // 直近50メッセージを取得
    const conversationId = relationship.conversations[0]?.id;
    const recentMessages = conversationId
      ? await prisma.message.findMany({
          where: {
            conversationId,
            role: { in: ['USER', 'CHARACTER'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { role: true, content: true },
        }).then((msgs) => msgs.reverse())
      : [];

    if (recentMessages.length < 3) {
      // 会話が少なすぎる場合はスキップ
      return;
    }

    // factMemoryを取得
    const memorySummary = relationship.memorySummary as Record<string, unknown> | null;
    const factMemory = memorySummary?.factMemory as string[] | null;

    // プロンプト構築
    const conversationText = recentMessages
      .map((m) => `${m.role === 'USER' ? 'ユーザー' : 'キャラ'}: ${m.content}`)
      .join('\n');

    const factMemoryText = factMemory && factMemory.length > 0
      ? `\n\n【既知の事実メモリ】\n${factMemory.join('\n')}`
      : '';

    const userContent = `${conversationText}${factMemoryText}`;

    const systemPrompt =
      '以下の会話履歴から、この人がどんな人か・何を求めているか・どう接すれば喜ぶかを4-5文の自然な日本語で要約せよ。属性リストではなく物語として書け。';

    const narrative = await callXAI(systemPrompt, userContent);

    // Relationshipに保存
    await prisma.relationship.update({
      where: { id: relationshipId },
      data: { narrativeSummary: narrative },
    });

    logger.info(`[generateNarrative] Updated narrative for relationship ${relationshipId}`);
  } catch (error) {
    // エラーはサイレントに無視（既存動作を壊さない）
    logger.warn('[generateNarrative] Failed (silently ignored):', error);
  }
}
