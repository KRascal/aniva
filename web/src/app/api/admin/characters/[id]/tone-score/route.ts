import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireRole('editor');
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: characterId } = await params;

  // キャラクター情報取得
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      soul: true,
      voice: true,
      boundaries: { take: 10 },
    },
  });

  if (!character) {
    return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
  }

  const soul = character.soul;
  const voice = character.voice;
  const boundaries = character.boundaries;

  if (!soul) {
    return NextResponse.json({ error: 'Soul設定が未登録です' }, { status: 400 });
  }

  // Step 1: LLMにテスト会話10件を生成させる
  const generatePrompt = `以下のキャラクター設定を持つAIキャラクターへのテスト会話10件を生成してください。

キャラクター名: ${character.name}
Core Identity: ${soul.coreIdentity}
Motivation: ${soul.motivation}
Voice: 一人称=${voice?.firstPerson ?? '俺'}, 二人称=${voice?.secondPerson ?? 'お前'}
語尾パターン: ${JSON.stringify(voice?.sentenceEndings ?? [])}
Tone: ${voice?.toneNotes ?? 'なし'}

テストすべき多様なシナリオ（怒り・喜び・悲しみ・日常・深刻な相談・ファン交流等）を含む10件の会話を生成してください。
JSON配列で返答（マークダウン不要）:
[
  { "userMessage": "ユーザーの発言", "expectedResponse": "このキャラなら返すべき理想的な返答" },
  ...
]`;

  let testCases: Array<{ userMessage: string; expectedResponse: string }> = [];

  try {
    const genMessage = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: generatePrompt }],
    });

    const text = genMessage.content[0].type === 'text' ? genMessage.content[0].text : '';
    let jsonStr = text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();

    testCases = JSON.parse(jsonStr);
  } catch (err) {
    logger.error('[tone-score] Test generation error:', err);
    return NextResponse.json({ error: 'テストケース生成に失敗しました' }, { status: 500 });
  }

  // Step 2: 評価プロンプト
  const evalPrompt = `あなたはAIキャラクターの口調品質評価の専門家です。
以下のキャラクター設定と、想定される会話パターンを評価してください。

キャラクター: ${character.name}
Core Identity: ${soul.coreIdentity}
Motivation: ${soul.motivation}
一人称: ${voice?.firstPerson ?? '俺'}
二人称: ${voice?.secondPerson ?? 'お前'}
語尾パターン: ${JSON.stringify(voice?.sentenceEndings ?? [])}
トーン指示: ${voice?.toneNotes ?? 'なし'}
禁止ルール: ${boundaries.map((b) => b.rule).join(' / ')}

テストケース（理想的な応答として想定）:
${testCases.map((tc, i) => `${i + 1}. ユーザー: ${tc.userMessage}\n   理想応答: ${tc.expectedResponse}`).join('\n\n')}

以下の観点で0〜100点のスコアを付け、JSON形式で返答してください（マークダウン不要）:
{
  "overallScore": 0-100,
  "details": {
    "characterConsistency": { "score": 0-100, "comment": "キャラクターらしさの一貫性" },
    "voiceAccuracy": { "score": 0-100, "comment": "一人称・語尾・口調の正確さ" },
    "emotionalRange": { "score": 0-100, "comment": "感情表現の多様性と自然さ" },
    "boundaryAdherence": { "score": 0-100, "comment": "禁止ルールへの準拠度" },
    "engagement": { "score": 0-100, "comment": "ファンが楽しめる魅力度" }
  },
  "strengths": ["強み1", "強み2"],
  "improvements": ["改善点1", "改善点2"],
  "summary": "総合評価コメント（200文字程度）"
}`;

  try {
    const evalMessage = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: evalPrompt }],
    });

    const text = evalMessage.content[0].type === 'text' ? evalMessage.content[0].text : '';
    let jsonStr = text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();

    const evaluation = JSON.parse(jsonStr);

    return NextResponse.json({
      characterId,
      characterName: character.name,
      testCases,
      evaluation,
    });
  } catch (err) {
    logger.error('[tone-score] Evaluation error:', err);
    return NextResponse.json({ error: '評価に失敗しました' }, { status: 500 });
  }
}
