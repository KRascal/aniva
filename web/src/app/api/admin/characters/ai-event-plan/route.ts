import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const admin = await requireRole('ip_admin');
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { monthName, characterIds, eventType } = body;

  if (!monthName || !characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
    return NextResponse.json(
      { error: 'monthName と characterIds（配列）は必須です' },
      { status: 400 },
    );
  }

  // キャラクター情報取得
  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, name: true, franchise: true },
  });

  if (characters.length === 0) {
    return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
  }

  const charList = characters
    .map((c) => `- ${c.name}（${c.franchise?.name ?? 'オリジナル'}）`)
    .join('\n');

  const prompt = `あなたはアニメ・漫画キャラクターのファンイベント企画の専門家です。
以下の条件でANIVAアプリのイベント計画を立案してください。

開催月: ${monthName}
イベントタイプ: ${eventType ?? '総合（バレンタイン・記念日・季節イベント等）'}
参加キャラクター:
${charList}

ファンが喜ぶイベント企画をJSON形式で提案してください（マークダウン不要）:
{
  "eventTitle": "イベントのタイトル（キャッチーな日本語）",
  "period": {
    "start": "開始日（例: 2月10日）",
    "end": "終了日（例: 2月14日）",
    "duration": "期間の説明"
  },
  "theme": "イベントのテーマ・コンセプト（200文字程度）",
  "scenario": {
    "overview": "イベントのストーリー概要（300文字程度）",
    "chapters": [
      { "day": "1日目", "title": "章タイトル", "content": "その日のイベント内容" },
      { "day": "最終日", "title": "章タイトル", "content": "クライマックス内容" }
    ]
  },
  "gacha": {
    "name": "ガチャ名",
    "pickupCharacters": ["ピックアップキャラ名1", "ピックアップキャラ名2"],
    "specialItems": ["限定アイテム1", "限定アイテム2", "限定アイテム3"],
    "rateupDescription": "ガチャの特徴説明"
  },
  "announcement": {
    "shortText": "告知SNS投稿文（140文字以内）",
    "fullText": "アプリ内告知文（400文字程度）",
    "hashtags": ["#タグ1", "#タグ2", "#タグ3"]
  },
  "characterEvents": [
    {
      "characterName": "キャラクター名",
      "specialContent": "そのキャラクター固有の特別コンテンツ"
    }
  ],
  "rewards": {
    "participation": "参加報酬",
    "completion": "クリア報酬",
    "ranking": "ランキング報酬（上位者向け）"
  }
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    let jsonStr = text.trim();

    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();

    let plan: Record<string, unknown>;
    try {
      plan = JSON.parse(jsonStr);
    } catch {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        plan = JSON.parse(objMatch[0]);
      } else {
        throw new Error('JSONの抽出に失敗しました');
      }
    }

    return NextResponse.json({
      monthName,
      eventType: eventType ?? '総合',
      characters: characters.map((c) => ({ id: c.id, name: c.name })),
      plan,
    });
  } catch (err) {
    logger.error('[ai-event-plan] LLM error:', err);
    return NextResponse.json({ error: 'イベント企画生成に失敗しました' }, { status: 500 });
  }
}
