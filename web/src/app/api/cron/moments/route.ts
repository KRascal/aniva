import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getTimeOfDay(): string {
  // JST = UTC+9
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  if (jstHour >= 5 && jstHour < 11) return 'morning';
  if (jstHour >= 11 && jstHour < 17) return 'afternoon';
  if (jstHour >= 17 && jstHour < 21) return 'evening';
  return 'night';
}

export async function GET(req: NextRequest) {
  try {
    // --- 認証 ---
    const secret = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- アクティブキャラ一覧取得 ---
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, systemPrompt: true },
    });

    if (characters.length === 0) {
      return NextResponse.json({ generated: [], message: 'No active characters' });
    }

    const timeOfDay = getTimeOfDay();
    const generated: Array<{ characterId: string; characterName: string; content: string }> = [];

    for (const character of characters) {
      try {
        // --- 最新5件のMomentsを取得 ---
        const recentMoments = await prisma.moment.findMany({
          where: { characterId: character.id, type: 'TEXT', content: { not: null } },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { content: true },
        });

        const recentTexts = recentMoments
          .map((m, i) => `${i + 1}. ${m.content}`)
          .join('\n');

        // --- Anthropicでテキスト生成 ---
        const systemMessage = character.systemPrompt;
        const userMessage = `あなたは${character.name}だ。SNSに投稿する1件の短いテキストを書け。
- キャラクターの口調・世界観を完璧に守ること
- 1-3文の短文
- 時間帯（朝/昼/夕/夜）に合った内容にすること
- 過去の投稿と被らないこと
過去の投稿:
${recentTexts || '（なし）'}
現在の時間帯: ${timeOfDay}

投稿テキストのみ返答せよ。説明や前置き・後書きは一切不要。`;

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{ role: 'user', content: userMessage }],
          system: systemMessage,
        });

        const content = (response.content[0] as { type: string; text: string }).text?.trim();
        if (!content) continue;

        // --- DBに保存 ---
        await prisma.moment.create({
          data: {
            characterId: character.id,
            type: 'TEXT',
            content,
            visibility: 'PUBLIC',
            publishedAt: new Date(),
          },
        });

        generated.push({ characterId: character.id, characterName: character.name, content });
      } catch (err) {
        console.error(`Moment generation failed for ${character.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      timeOfDay,
      generated,
      count: generated.length,
    });
  } catch (err) {
    console.error('Cron moments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
