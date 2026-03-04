import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterId } = body;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId は必須です' }, { status: 400 });
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, franchise: true, systemPrompt: true, personalityTraits: true },
  });

  if (!character) {
    return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `あなたはアニメ・マンガキャラクターの深層心理と秘密を設計する専門家です。

以下のキャラクター情報を元に、関係レベルが上がった時に解放される「秘密コンテンツ」を5件生成してください。

キャラクター名: ${character.name}
フランチャイズ: ${character.franchise}
システムプロンプト:
${character.systemPrompt.slice(0, 2000)}

パーソナリティトレイト:
${JSON.stringify(character.personalityTraits)}

【生成ルール】
- 5件生成し、unlockLevel は 3, 4, 5, 6, 7 を順番に使う
- type は "conversation_topic" と "backstory" を混ぜる（3:2程度）
- 日本語で生成
- キャラの深層心理・過去・秘密・本音をテーマに
- promptAddition: 会話AIへの指示文（「【秘密解放: Lv●】...のように話す」形式）
- 各秘密は具体的で感情的な深みがあること
- キャラの公式設定と矛盾しないこと

以下のJSON配列形式のみで返してください（説明文不要）:
[
  {
    "unlockLevel": 3,
    "type": "conversation_topic",
    "title": "タイトル（10文字以内）",
    "content": "秘密の内容（50文字程度）",
    "promptAddition": "【秘密解放: Lv3】会話AIへの具体的な指示文（100-200文字）"
  },
  ...
]`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'AI生成に失敗しました: JSONが見つかりません' }, { status: 500 });
  }

  let generated: Array<{
    unlockLevel: number;
    type: string;
    title: string;
    content: string;
    promptAddition?: string;
  }>;
  try {
    generated = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: 'AI生成に失敗しました: JSONパースエラー' }, { status: 500 });
  }

  // Save to DB
  const saved = await Promise.all(
    generated.map((item, idx) =>
      prisma.secretContent.create({
        data: {
          characterId,
          unlockLevel: item.unlockLevel ?? 3 + idx,
          type: item.type ?? 'conversation_topic',
          title: item.title,
          content: item.content,
          promptAddition: item.promptAddition ?? null,
          order: idx,
        },
      })
    )
  );

  return NextResponse.json(saved);
}
