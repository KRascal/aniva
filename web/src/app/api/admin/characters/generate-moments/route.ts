import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterId, slug, count = 5 } = body;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId は必須です' }, { status: 400 });
  }

  // Fetch character details for context
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, franchise: true, systemPrompt: true, catchphrases: true },
  });

  if (!character) {
    return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const catchphrasesText = Array.isArray(character.catchphrases)
    ? character.catchphrases.join('、')
    : String(character.catchphrases || '');

  const prompt = `キャラクター「${character.name}」(${character.franchise})のSNS風Momentsを${count}件生成してください。
${character.systemPrompt ? `キャラクター設定: ${character.systemPrompt.slice(0, 200)}` : ''}
${catchphrasesText ? `キャッチフレーズ: ${catchphrasesText}` : ''}

各Momentのキャプションは100文字以内、キャラクターの口調で書いてください。

必ずJSONのみで返答してください（マークダウンコードブロック不要）:
[{ "caption": "キャプションテキスト" }, ...]`;

  let momentsData: { caption: string }[] = [];

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    let jsonStr = text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
    momentsData = JSON.parse(jsonStr);
    if (!Array.isArray(momentsData)) {
      momentsData = [];
    }
  } catch (err) {
    logger.error('Claude API error:', err);
    return NextResponse.json({ error: 'AI生成に失敗しました' }, { status: 500 });
  }

  // Insert into DB using actual Moment schema fields
  let createdMoments: { id: string; mediaUrl: string | null; content: string | null }[] = [];
  try {
    await prisma.moment.createMany({
      data: momentsData.slice(0, count).map((m) => ({
        characterId,
        type: 'TEXT' as const,
        content: m.caption || '',
        mediaUrl: null,
        visibility: 'PUBLIC' as const,
        levelRequired: 0,
        publishedAt: new Date(),
      })),
    });

    // Fetch the created moments to return them
    createdMoments = await prisma.moment.findMany({
      where: { characterId },
      orderBy: { createdAt: 'desc' },
      take: count,
      select: { id: true, mediaUrl: true, content: true },
    });
  } catch (err) {
    logger.error('DB insert error:', err);
    return NextResponse.json({ error: 'DBへの書き込みに失敗しました' }, { status: 500 });
  }

  return NextResponse.json({
    moments: createdMoments.map((m) => ({
      id: m.id,
      imageUrl: m.mediaUrl,
      caption: m.content,
    })),
    count: createdMoments.length,
  });
}
