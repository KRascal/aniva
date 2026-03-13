/**
 * POST /api/chat/reaction-response
 * Body: { characterId, emoji, recentMessages? }
 * 
 * LLMでキャラのリアクション応答を動的生成。全キャラ対応。
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const EMOJI_CONTEXT: Record<string, string> = {
  '❤️': 'ユーザーがハートのリアクションを送った（愛情・好き・照れ）',
  '😂': 'ユーザーが爆笑リアクションを送った（面白い・笑える）',
  '😢': 'ユーザーが泣きリアクションを送った（悲しい・感動・切ない）',
  '🔥': 'ユーザーが炎リアクションを送った（熱い・すごい・燃える）',
  '👏': 'ユーザーが拍手リアクションを送った（すごい・褒め・感心）',
  '😍': 'ユーザーがハート目リアクションを送った（大好き・かわいい・最高）',
  '💪': 'ユーザーが筋肉リアクションを送った（頑張れ・強い・応援）',
  '😮': 'ユーザーが驚きリアクションを送った（びっくり・すごい・まじで）',
  '👍': 'ユーザーがいいねリアクションを送った（同意・OK・いいね）',
  '😡': 'ユーザーが怒りリアクションを送った（怒り・不満・ムカつく）',
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { characterId, emoji, lastMessage } = body as {
    characterId: string;
    emoji: string;
    lastMessage?: string;
  };

  if (!characterId || !emoji) {
    return NextResponse.json({ error: 'characterId and emoji required' }, { status: 400 });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true, systemPrompt: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const emojiContext = EMOJI_CONTEXT[emoji] || `ユーザーが「${emoji}」リアクションを送った`;

    const prompt = `あなたは${character.name}です。以下の設定を厳守してください:

${character.systemPrompt.slice(0, 2000)}

【状況】
${emojiContext}
${lastMessage ? `直前のメッセージ: 「${lastMessage}」` : ''}

【ルール】
- ${character.name}の口調・一人称で1文〜2文で短く反応する
- リアクション絵文字に対するキャラらしいリアクションを返す
- 長くなりすぎない（最大50文字程度）
- 絵文字は使わない（テキストのみ）
- 「」は使わない`;

    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) {
      return NextResponse.json({ error: 'LLM API key not configured' }, { status: 500 });
    }

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `${emoji} リアクションへの反応を1文で。` },
        ],
        max_tokens: 100,
        temperature: 1.0,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'LLM API error' }, { status: 502 });
    }

    const data = await res.json();
    const response = data.choices?.[0]?.message?.content?.trim() || '…';

    return NextResponse.json({ response });
  } catch (err) {
    logger.error('[reaction-response] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
