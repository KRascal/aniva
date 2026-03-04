import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/characters/generate-story
 * 新規キャラ追加フロー(P7-2): 初期ストーリーチャプター3件をAI生成してDBに保存
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterId } = body;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId は必須です' }, { status: 400 });
  }

  // Fetch character details
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, franchise: true, systemPrompt: true, catchphrases: true },
  });

  if (!character) {
    return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
  }

  // Check if chapters already exist
  const existingCount = await prisma.storyChapter.count({ where: { characterId } });
  if (existingCount > 0) {
    return NextResponse.json({ error: 'ストーリーチャプターは既に存在します' }, { status: 400 });
  }

  const catchphrasesText = Array.isArray(character.catchphrases)
    ? character.catchphrases.join('、')
    : String(character.catchphrases || '');

  // Use xAI to generate story chapters
  const xaiBaseUrl = 'https://api.x.ai/v1';
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'XAI_API_KEY が未設定です' }, { status: 500 });
  }

  const prompt = `キャラクター「${character.name}」(${character.franchise})のANIVAストーリーモード用チャプターを3件生成してください。
${character.systemPrompt ? `キャラクター設定: ${character.systemPrompt.slice(0, 300)}` : ''}
${catchphrasesText ? `キャッチフレーズ: ${catchphrasesText}` : ''}

ストーリーは「ユーザーとキャラが出会い、絆を深めていく」インタラクティブなシナリオです。

チャプター構成:
- Chapter 1 (unlockLevel:1): 初めての出会い・自己紹介
- Chapter 2 (unlockLevel:3): 少し打ち解けてきた頃のエピソード
- Chapter 3 (unlockLevel:5, isFcOnly:true): 特別な秘密を打ち明けるFC限定エピソード

各チャプターを以下のJSON形式で返してください（マークダウンコードブロック不要）:
[
  {
    "chapterNumber": 1,
    "title": "チャプタータイトル（20文字以内）",
    "synopsis": "あらすじ（100文字程度、ユーザー目線で引き込む内容）",
    "unlockLevel": 1,
    "isFcOnly": false,
    "triggerPrompt": "チャプター開始時にキャラが送るメッセージ（キャラの口調で、50文字程度）",
    "choices": [
      { "text": "選択肢1（20文字以内）", "consequence": "選択結果の説明", "nextTease": "次の展開のヒント" },
      { "text": "選択肢2（20文字以内）", "consequence": "選択結果の説明", "nextTease": "次の展開のヒント" }
    ]
  },
  ...
]`;

  let chaptersData: {
    chapterNumber: number;
    title: string;
    synopsis: string;
    unlockLevel: number;
    isFcOnly: boolean;
    triggerPrompt: string;
    choices: { text: string; consequence: string; nextTease: string }[];
  }[] = [];

  try {
    const response = await fetch(`${xaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('xAI API error:', err);
      return NextResponse.json({ error: 'AI生成に失敗しました' }, { status: 500 });
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '[]';
    let jsonStr = text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
    chaptersData = JSON.parse(jsonStr);
    if (!Array.isArray(chaptersData)) chaptersData = [];
  } catch (err) {
    console.error('xAI parse error:', err);
    return NextResponse.json({ error: 'AI生成の解析に失敗しました' }, { status: 500 });
  }

  // Insert chapters to DB
  const created: { id: string; chapterNumber: number; title: string }[] = [];
  try {
    for (const ch of chaptersData.slice(0, 3)) {
      const chapter = await prisma.storyChapter.create({
        data: {
          characterId,
          chapterNumber: ch.chapterNumber || 1,
          title: ch.title || `Chapter ${ch.chapterNumber}`,
          synopsis: ch.synopsis || '',
          unlockLevel: ch.unlockLevel ?? 1,
          isFcOnly: ch.isFcOnly ?? false,
          triggerPrompt: ch.triggerPrompt || '',
          choices: ch.choices ?? [],
          isActive: true,
        },
        select: { id: true, chapterNumber: true, title: true },
      });
      created.push(chapter);
    }
  } catch (err) {
    console.error('DB insert error:', err);
    return NextResponse.json({ error: 'DBへの書き込みに失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ chapters: created, count: created.length });
}
