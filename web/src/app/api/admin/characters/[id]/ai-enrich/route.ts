import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  const section = body.section ?? 'all'; // 'voice' | 'personality' | 'boundary' | 'all'

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      voice: true,
      boundaries: { where: { isActive: true } },
    },
  });

  if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 503 });

  const prompt = buildEnrichPrompt(character, section);

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
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

    // JSONパース試行
    let enriched: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      enriched = JSON.parse(jsonStr);
    } catch {
      // JSONでなければテキストとして返す
      return NextResponse.json({ success: true, rawContent: content, parsed: false });
    }

    // DB反映（承認なしで即反映 - 管理者が確認後に呼ぶ想定）
    const updates: Promise<unknown>[] = [];

    if (section === 'all' || section === 'voice') {
      const voiceData = enriched.voice as Record<string, unknown> | undefined;
      if (voiceData && character.voice) {
        updates.push(
          prisma.characterVoice.update({
            where: { characterId: id },
            data: {
              description: voiceData.description as string ?? character.voice.description,
              speechStyle: voiceData.speechStyle as string ?? character.voice.speechStyle,
              firstPerson: voiceData.firstPerson as string ?? character.voice.firstPerson,
              secondPerson: voiceData.secondPerson as string ?? character.voice.secondPerson,
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
              description: personalityData.description as string ?? character.description,
              personality: personalityData.traits as string ?? character.personality,
            },
          })
        );
      }
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, enriched, applied: updates.length > 0 });
  } catch (error) {
    console.error('[ai-enrich] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildEnrichPrompt(character: {
  name: string;
  description: string | null;
  personality: string | null;
  franchise: string | null;
  voice?: { speechStyle: string | null; firstPerson: string | null; description: string | null } | null;
}, section: string): string {
  return `あなたはANIVAというキャラクターAIプラットフォームの設定エキスパートです。
以下のキャラクター情報を元に、${section === 'all' ? '人格・音声・境界設定' : section}を深掘りして、より精密なキャラクター設定を生成してください。

## キャラクター基本情報
- 名前: ${character.name}
- 作品: ${character.franchise ?? '不明'}
- 説明: ${character.description ?? '未設定'}
- 性格: ${character.personality ?? '未設定'}
- 現在の口調: ${character.voice?.speechStyle ?? '未設定'}
- 一人称: ${character.voice?.firstPerson ?? '未設定'}

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
    "description": "話し方の詳細説明（100文字以上）",
    "speechStyle": "口調の特徴（例: 荒々しく豪快、敬語使わない）",
    "firstPerson": "一人称（俺/私/僕など）",
    "secondPerson": "二人称（お前/あなた/君など）",
    "bannedPhrases": ["絶対使わない表現1", "絶対使わない表現2"],
    "typicalPhrases": ["よく使う口癖1", "よく使う口癖2", "よく使う口癖3"],
    "emotionExpressions": {
      "happy": "喜んだ時の典型的な表現",
      "sad": "悲しんだ時の典型的な表現",
      "angry": "怒った時の典型的な表現",
      "embarrassed": "照れた時の典型的な表現"
    }
  },
  "knowledge": {
    "canTalkAbout": ["話せること1", "話せること2"],
    "cannotTalkAbout": ["話せないこと1（例: 原作未公開情報）"]
  },
  "boundaries": {
    "hardLimits": ["絶対にやらないこと1", "絶対にやらないこと2"],
    "softLimits": ["基本やらないが例外あること"]
  }
}
\`\`\``;
}
