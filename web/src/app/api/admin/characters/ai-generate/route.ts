import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const admin = await requireRole('editor');
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterName, franchiseName, brief, saveImmediately, characterId } = body;

  if (!characterName || !franchiseName) {
    return NextResponse.json(
      { error: 'characterName と franchiseName は必須です' },
      { status: 400 },
    );
  }

  const prompt = `あなたはアニメ・漫画キャラクターの性格分析の専門家です。
以下のキャラクターについて、ANIVAファンチャット用の詳細な設定を生成してください。

キャラクター名: ${characterName}
作品名: ${franchiseName}
${brief ? `補足情報: ${brief}` : ''}

以下のJSON形式で回答してください（マークダウンコードブロックは不要、JSONのみ）:
{
  "coreIdentity": "（キャラクターを1行で定義する文。「〜である」の形式）",
  "motivation": "（行動原理・動機。なぜそう行動するかの核心。200文字程度）",
  "systemPrompt": "（このキャラクターをAIに演じさせるためのsystem prompt。800文字程度。一人称・口調・禁止事項・行動原則を含む）",
  "emotionalPatterns": {
    "triggers": [
      { "stimulus": "喜ぶきっかけとなる言葉や状況", "response": "そのときの反応の仕方", "intensity": 8 },
      { "stimulus": "怒るきっかけとなる言葉や状況", "response": "そのときの反応の仕方", "intensity": 9 },
      { "stimulus": "悲しむきっかけとなる言葉や状況", "response": "そのときの反応の仕方", "intensity": 7 },
      { "stimulus": "照れるきっかけとなる言葉や状況", "response": "そのときの反応の仕方", "intensity": 6 },
      { "stimulus": "テンションが上がる状況", "response": "そのときの反応の仕方", "intensity": 8 }
    ],
    "avoidances": [
      { "topic": "避けるべき話題1", "reason": "なぜ避けるか", "deflection": "話題を変えるときの台詞例" },
      { "topic": "避けるべき話題2", "reason": "なぜ避けるか", "deflection": "話題を変えるときの台詞例" },
      { "topic": "避けるべき話題3", "reason": "なぜ避けるか", "deflection": "話題を変えるときの台詞例" }
    ]
  },
  "voice": {
    "firstPerson": "一人称（俺/私/僕/ワタシ等）",
    "secondPerson": "二人称（お前/君/あなた等）",
    "sentenceEndings": ["語尾パターン1", "語尾パターン2", "語尾パターン3", "語尾パターン4", "語尾パターン5"],
    "toneRules": "口調の総合的なルール。どんな雰囲気で話すか、特徴的な話し方、言葉遣いのクセなど200文字程度"
  },
  "boundaries": [
    { "rule": "絶対にやってはいけないこと1", "category": "behavior", "severity": "hard" },
    { "rule": "絶対にやってはいけないこと2", "category": "speech", "severity": "hard" },
    { "rule": "原則として避けること", "category": "knowledge", "severity": "soft" }
  ],
  "loreMemories": [
    "キャラクターが持つ重要な記憶・出来事1",
    "キャラクターが持つ重要な記憶・出来事2",
    "キャラクターが持つ重要な記憶・出来事3"
  ],
  "relationships": {
    "親友の名前": "関係性の説明",
    "ライバルの名前": "関係性の説明",
    "師匠や親の名前": "関係性の説明"
  },
  "famousQuotes": [
    "名台詞1（原作より）",
    "名台詞2（原作より）",
    "名台詞3（原作より）",
    "名台詞4（原作より）",
    "名台詞5（原作より）"
  ]
}`;

  let generated: Record<string, unknown>;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    let jsonStr = text.trim();

    // コードブロック除去
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();

    try {
      generated = JSON.parse(jsonStr);
    } catch {
      // フォールバック: 部分パースを試みる
      logger.warn('[ai-generate] JSON parse failed, attempting partial extraction');
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        generated = JSON.parse(objMatch[0]);
      } else {
        throw new Error('JSONの抽出に失敗しました');
      }
    }
  } catch (err) {
    logger.error('[ai-generate] LLM error:', err);
    return NextResponse.json({ error: 'AI生成に失敗しました' }, { status: 500 });
  }

  // saveImmediately が true で characterId が指定されている場合はDB保存
  if (saveImmediately && characterId) {
    try {
      const voice = generated.voice as Record<string, unknown> | undefined;
      const boundaries = generated.boundaries as Array<{
        rule: string;
        category?: string;
        severity?: string;
      }> | undefined;
      const famousQuotes = generated.famousQuotes as string[] | undefined;

      // CharacterSoul upsert
      await prisma.characterSoul.upsert({
        where: { characterId },
        create: {
          characterId,
          coreIdentity: (generated.coreIdentity as string) || '',
          motivation: (generated.motivation as string) || '',
          worldview: (generated.systemPrompt as string) || '',
          emotionalPatterns: (generated.emotionalPatterns as object) || {},
          relationshipMap: (generated.relationships as object) || {},
          personalityAxes: {},
        },
        update: {
          coreIdentity: generated.coreIdentity as string,
          motivation: generated.motivation as string,
          worldview: generated.systemPrompt as string,
          emotionalPatterns: (generated.emotionalPatterns as object) || {},
          relationshipMap: (generated.relationships as object) || {},
        },
      });

      // CharacterVoice upsert
      if (voice) {
        await prisma.characterVoice.upsert({
          where: { characterId },
          create: {
            characterId,
            firstPerson: (voice.firstPerson as string) || '俺',
            secondPerson: (voice.secondPerson as string) || 'お前',
            sentenceEndings: (voice.sentenceEndings as string[]) || [],
            toneNotes: (voice.toneRules as string) || null,
          },
          update: {
            firstPerson: (voice.firstPerson as string) || '俺',
            secondPerson: (voice.secondPerson as string) || 'お前',
            sentenceEndings: (voice.sentenceEndings as string[]) || [],
            toneNotes: (voice.toneRules as string) || null,
          },
        });
      }

      // CharacterBoundary createMany（既存削除後に再作成）
      if (boundaries && boundaries.length > 0) {
        await prisma.characterBoundary.deleteMany({ where: { characterId } });
        await prisma.characterBoundary.createMany({
          data: boundaries.map((b) => ({
            characterId,
            rule: b.rule || '',
            category: b.category || 'behavior',
            severity: b.severity || 'hard',
          })),
        });
      }

      // CharacterQuote createMany（既存削除後に再作成）
      if (famousQuotes && famousQuotes.length > 0) {
        await prisma.characterQuote.deleteMany({ where: { characterId } });
        await prisma.characterQuote.createMany({
          data: famousQuotes.map((q) => ({
            characterId,
            quote: q,
            category: 'catchphrase',
            importance: 8,
          })),
        });
      }

      logger.info(`[ai-generate] Saved to DB for characterId=${characterId}`);
    } catch (err) {
      logger.error('[ai-generate] DB save error:', err);
      // DB保存失敗しても生成結果は返す
      return NextResponse.json({ ...generated, saveError: 'DB保存に失敗しました' });
    }
  }

  return NextResponse.json(generated);
}
