/**
 * POST /api/group-chat
 * グループチャット — ユーザー + 複数キャラクターの掛け合い
 * 
 * 設計:
 * - キャラA・Bが互いに認識している（「○○と一緒だ」という文脈）
 * - ユーザーのメッセージに対して、2〜3キャラが順番に応答
 * - キャラ間の関係性（同じ作品 = 深い絆 / 別作品 = 初対面）を自動判定
 * - 1キャラずつ順番に生成し、前のキャラの発言を次の入力に含める
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const MAX_CHARACTERS = 3;
const RESPONSE_MAX_TOKENS = 200;

interface GroupMessage {
  characterId: string;
  characterName: string;
  content: string;
  emotion: string;
}

interface GroupChatRequest {
  characterIds: string[];  // 2〜3キャラのID
  userMessage: string;
  conversationHistory?: Array<{ role: string; characterId: string; content: string }>;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterIds, userMessage, conversationHistory = [] }: GroupChatRequest = await req.json();

  if (!characterIds || characterIds.length < 2 || characterIds.length > MAX_CHARACTERS) {
    return NextResponse.json({ error: 'Need 2-3 character IDs' }, { status: 400 });
  }

  if (!userMessage || userMessage.length > 500) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  // キャラ情報取得
  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, name: true, franchise: true, systemPrompt: true, personalityTraits: true },
  });

  if (characters.length !== characterIds.length) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const responses: GroupMessage[] = [];

  // 過去の会話履歴テキスト
  const historyText = conversationHistory.slice(-6).map(m => {
    if (m.role === 'user') return `ユーザー: ${m.content}`;
    const c = characters.find(ch => ch.id === m.characterId);
    return `${c?.name ?? m.characterId}: ${m.content}`;
  }).join('\n');

  // キャラごとに順番に応答生成
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const otherChars = characters.filter(c => c.id !== char.id);

    // 同一フランチャイズ判定
    const sameGroup = otherChars.some(c => c.franchise === char.franchise);
    const groupContext = sameGroup
      ? `今${otherChars.map(c => c.name).join('と')}と一緒にいる。`
      : `今${otherChars.map(c => `${c.franchise}の${c.name}`).join('と')}という異なる世界の存在と会っている。`;

    // 前のキャラの発言
    const previousResponses = responses.map(r => `${r.characterName}: ${r.content}`).join('\n');

    const systemPrompt = `${char.systemPrompt}

【グループチャット設定】
${groupContext}
${char.personalityTraits ? `性格: ${char.personalityTraits.join(', ')}` : ''}

[ルール]
- 1〜2文で返す
- キャラクターの口調を完全に維持
- 他のキャラの発言に反応してもよい（ツッコミ、同意、対立）
- ユーザーにも応答する
- JSONのみ返す: {"content":"発言","emotion":"happy|sad|angry|excited|embarrassed|neutral|love"}`;

    const userPrompt = `${historyText ? `過去の会話:\n${historyText}\n\n` : ''}${previousResponses ? `直前の発言:\n${previousResponses}\n\n` : ''}ユーザー: ${userMessage}\n\n${char.name}として1〜2文で応答してください。`;

    try {
      let content = '';
      let emotion = 'neutral';

      if (xaiKey) {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'grok-3-mini',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            max_tokens: RESPONSE_MAX_TOKENS,
            temperature: 0.9,
            response_format: { type: 'json_object' },
          }),
        });
        if (res.ok) {
          const data = await res.json() as { choices: Array<{ message: { content: string } }> };
          const parsed = JSON.parse(data.choices[0].message.content) as { content: string; emotion: string };
          content = parsed.content;
          emotion = parsed.emotion ?? 'neutral';
        }
      }

      if (!content && anthropicKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': anthropicKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-20250514',
            max_tokens: RESPONSE_MAX_TOKENS,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json() as { content: Array<{ text?: string }> };
          const text = data.content[0]?.text ?? '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as { content: string; emotion: string };
            content = parsed.content;
            emotion = parsed.emotion ?? 'neutral';
          }
        }
      }

      if (content) {
        responses.push({ characterId: char.id, characterName: char.name, content, emotion });
      }
    } catch (err) {
      console.error(`[GroupChat] ${char.name} generation failed:`, err);
    }
  }

  return NextResponse.json({
    messages: responses,
    userMessage,
    timestamp: new Date().toISOString(),
  });
}
