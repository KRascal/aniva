import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/llm';

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

    // Moment数が少ないキャラを優先して生成（偏り自動補正）
    const maxPerRun = 3;
    const momentCounts = await prisma.moment.groupBy({
      by: ['characterId'],
      _count: { id: true },
    });
    const countMap = new Map(momentCounts.map(m => [m.characterId, m._count.id]));
    
    // Moment数の少ない順にソート（同数ならランダム）
    const sorted = [...characters].sort((a, b) => {
      const ca = countMap.get(a.id) ?? 0;
      const cb = countMap.get(b.id) ?? 0;
      return ca !== cb ? ca - cb : Math.random() - 0.5;
    });
    const batchChars = sorted.slice(0, maxPerRun);

    const timeOfDay = getTimeOfDay();
    const generated: Array<{ characterId: string; characterName: string; content: string }> = [];

    for (const [batchIndex, character] of batchChars.entries()) {
      try {
        // 最低3時間インターバルチェック（連投防止）
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const recentPost = await prisma.moment.findFirst({
          where: { characterId: character.id, type: 'TEXT', publishedAt: { gte: threeHoursAgo } },
        });
        if (recentPost) continue;

        // --- 最新5件のMomentsを取得 ---
        const recentMoments = await prisma.moment.findMany({
          where: { characterId: character.id, type: 'TEXT', content: { not: null } },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { content: true },
        });

        const recentTexts = recentMoments
          .map((m: { content: string | null }, i: number) => `${i + 1}. ${m.content}`)
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

        const content = await generateText(systemMessage, userMessage);
        if (!content) continue;

        // publishedAtをバッチ順に少しずらす（0/20/40分前）+ さらに0〜10分のランダム
        const baseOffsetMinutes = batchIndex * 20;
        const randomJitter = Math.floor(Math.random() * 10);
        const staggeredPublishedAt = new Date(Date.now() - (baseOffsetMinutes + randomJitter) * 60 * 1000);

        // --- DBに保存 ---
        await prisma.moment.create({
          data: {
            characterId: character.id,
            type: 'TEXT',
            content,
            visibility: 'PUBLIC',
            publishedAt: staggeredPublishedAt,
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
      batch: `${maxPerRun} lowest-moment chars of ${characters.length}`,
    });
  } catch (err) {
    console.error('Cron moments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
