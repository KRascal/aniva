import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/characters/[id]/ai-enrich
 * AIでキャラクターの人格・音声・境界設定を自動深掘り
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  if (!adminEmails.includes(session?.user?.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { section?: string };
  const section = body.section ?? 'all';

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      voice: true,
      boundaries: true,
    },
  });

  if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 503 });

  const traits = Array.isArray(character.personalityTraits)
    ? (character.personalityTraits as string[]).join(', ')
    : '未設定';

  const prompt = buildEnrichPrompt({
    name: character.name,
    description: character.description,
    traits,
    franchise: character.franchise,
    toneNotes: character.voice?.toneNotes ?? null,
    firstPerson: character.voice?.firstPerson ?? '俺',
  }, section);

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: 'AI API error', detail: err }, { status: 502 });
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content ?? '';

    let enriched: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      enriched = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ success: true, rawContent: content, parsed: false });
    }

    const updates: Promise<unknown>[] = [];

    if (section === 'all' || section === 'voice') {
      const voiceData = enriched.voice as Record<string, unknown> | undefined;
      if (voiceData && character.voice) {
        updates.push(
          prisma.characterVoice.update({
            where: { characterId: id },
            data: {
              toneNotes: (voiceData.toneNotes as string) ?? character.voice.toneNotes,
              firstPerson: (voiceData.firstPerson as string) ?? character.voice.firstPerson,
              secondPerson: (voiceData.secondPerson as string) ?? character.voice.secondPerson,
              laughStyle: (voiceData.laughStyle as string) ?? character.voice.laughStyle,
              angryStyle: (voiceData.angryStyle as string) ?? character.voice.angryStyle,
              sadStyle: (voiceData.sadStyle as string) ?? character.voice.sadStyle,
            },
          })
        );
      }
    }

    if (section === 'all' || section === 'personality') {
      const personalityData = enriched.personality as Record<string, unknown> | undefined;
      if (personalityData) {
        updates.push(
          prisma.character.update({
            where: { id },
            data: {
              description: (personalityData.description as string) ?? character.description,
              personalityTraits: personalityData.traits
                ? (personalityData.traits as string).split(',').map((t: string) => t.trim())
                : (character.personalityTraits as string[]),
            },
          })
        );
      }
    }

    await Promise.all(updates);
    return NextResponse.json({ success: true, enriched, applied: updates.length > 0 });
  } catch (error) {
    logger.error('[ai-enrich] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildEnrichPrompt(character: {
  name: string;
  description: string | null;
  traits: string;
  franchise: string | null;
  toneNotes: string | null;
  firstPerson: string;
}, section: string): string {
  return `あなたはANIVAというキャラクターAIプラットフォームの設定エキスパートです。
以下のキャラクター情報を元に、${section === 'all' ? '人格・音声・境界設定' : section}を深掘りして、より精密なキャラクター設定を生成してください。

## キャラクター基本情報
- 名前: ${character.name}
- 作品: ${character.franchise ?? '不明'}
- 説明: ${character.description ?? '未設定'}
- 性格特性: ${character.traits}
- 現在のトーンメモ: ${character.toneNotes ?? '未設定'}
- 一人称: ${character.firstPerson}

## 生成指示
以下のJSON形式で、キャラクターの設定を深掘りしてください。
アニメ/マンガの原作に忠実に、ただしファンが感動するレベルの精度で。

\`\`\`json
{
  "personality": {
    "description": "キャラクターの詳細な人格説明（200文字以上）",
    "traits": "性格特性のリスト（カンマ区切り）",
    "values": "大切にしていること・信念",
    "fears": "恐れていること・弱点",
    "dreams": "夢・目標"
  },
  "voice": {
    "toneNotes": "話し方の総合的なトーン指示（100文字以上）",
    "firstPerson": "一人称",
    "secondPerson": "二人称",
    "laughStyle": "笑い方",
    "angryStyle": "怒った時の表現",
    "sadStyle": "悲しんだ時の表現"
  },
  "boundaries": {
    "hardLimits": ["絶対にやらないこと1", "絶対にやらないこと2"],
    "softLimits": ["基本やらないが例外あること"]
  }
}
\`\`\``;
}
