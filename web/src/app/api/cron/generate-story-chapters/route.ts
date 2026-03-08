/**
 * GET /api/cron/generate-story-chapters?secret=xxx&max=3
 * 全キャラのストーリーを3章→6章に増強（4-6章目を追加生成）
 * BGMタイプも設定する
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BGM_BY_CHAPTER: Record<number, string> = {
  1: 'adventure',   // 出会い・導入
  2: 'emotional',   // 打ち明け話
  3: 'dramatic',    // クライマックス（既存）
  4: 'adventure',   // 新たな展開
  5: 'emotional',   // 深まる絆
  6: 'dramatic',    // FC限定・最深部
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const maxChars = parseInt(req.nextUrl.searchParams.get('max') || '5', 10);

  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    return NextResponse.json({ error: 'XAI_API_KEY not set' }, { status: 500 });
  }

  try {
    // 既存章数をカウント、6章未満のキャラを取得
    const chapterCounts = await prisma.storyChapter.groupBy({
      by: ['characterId'],
      _count: { id: true },
    });
    const countMap = new Map(chapterCounts.map(c => [c.characterId, c._count.id]));

    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, franchise: true, systemPrompt: true },
    });

    // 6章未満かつ章数が少ない順に優先
    const needsMore = characters
      .filter(c => (countMap.get(c.id) ?? 0) < 6)
      .sort((a, b) => (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0))
      .slice(0, maxChars);

    // 既存章のBGMを設定（nullの場合）
    await prisma.$executeRawUnsafe(`
      UPDATE "StoryChapter"
      SET "bgmType" = CASE
        WHEN "chapterNumber" = 1 THEN 'adventure'
        WHEN "chapterNumber" = 2 THEN 'emotional'
        WHEN "chapterNumber" = 3 THEN 'dramatic'
        ELSE "bgmType"
      END
      WHERE "bgmType" IS NULL
    `);

    let generated = 0;
    const results: Array<{ name: string; chapters: number[] }> = [];

    for (const char of needsMore) {
      const existingCount = countMap.get(char.id) ?? 0;
      const existingChapters = await prisma.storyChapter.findMany({
        where: { characterId: char.id },
        select: { title: true, synopsis: true, chapterNumber: true },
        orderBy: { chapterNumber: 'asc' },
      });

      const existingSynopses = existingChapters
        .map(c => `第${c.chapterNumber}章「${c.title}」: ${c.synopsis}`)
        .join('\n');

      const chaptersToAdd = [];
      for (let chNum = existingCount + 1; chNum <= 6; chNum++) {
        chaptersToAdd.push(chNum);
      }

      const charResult: number[] = [];

      for (const chapterNum of chaptersToAdd) {
        const isFC = chapterNum >= 5;
        const unlockLevel = chapterNum <= 2 ? 1 : chapterNum <= 4 ? 3 : 5;

        const prompt = `あなたはANIVAプラットフォームのストーリーライターです。
キャラクター「${char.name}」(${char.franchise})の第${chapterNum}章を作成してください。

【キャラクター設定】
${char.systemPrompt.slice(0, 1500)}

【既存ストーリー（第1〜${existingCount}章）】
${existingSynopses}

【第${chapterNum}章の要件】
- ロック解除レベル: ${unlockLevel}/5
- FC限定: ${isFC ? 'はい（特別に親密な内容）' : 'いいえ'}
- 前章からの自然な流れを意識する
- キャラの深い内面・秘密・成長を描く
- ${chapterNum >= 4 ? 'より感情的で深い内容にする' : '基本的な親密化のストーリー'}

以下の形式で出力してください（JSON形式）:
{
  "title": "章タイトル（10文字以内）",
  "synopsis": "あらすじ（100-200文字、ユーザー目線で読ませる文）",
  "triggerPrompt": "このチャプターでキャラが話す内容の指示（キャラへの内部プロンプト、100-200文字）"
}`;

        try {
          const res = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: process.env.LLM_MODEL || 'grok-3-mini',
              messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: `第${chapterNum}章を生成してください。` },
              ],
              max_tokens: 600,
              temperature: 0.85,
            }),
          });

          if (!res.ok) continue;

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';

          // JSON解析
          let parsed: { title?: string; synopsis?: string; triggerPrompt?: string } = {};
          try {
            const jsonMatch = text.match(/\{[\s\S]+\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // フォールバック: テキストから抽出
            parsed = {
              title: `第${chapterNum}章`,
              synopsis: text.slice(0, 200),
              triggerPrompt: `${char.name}の第${chapterNum}章の内容を語れ。`,
            };
          }

          await prisma.storyChapter.upsert({
            where: {
              characterId_chapterNumber: {
                characterId: char.id,
                chapterNumber: chapterNum,
              },
            },
            update: {
              title: parsed.title || `第${chapterNum}章`,
              synopsis: parsed.synopsis || '',
              triggerPrompt: parsed.triggerPrompt || '',
            },
            create: {
              id: `ch-${char.id}-${chapterNum}-${Date.now()}`,
              characterId: char.id,
              chapterNumber: chapterNum,
              title: parsed.title || `第${chapterNum}章`,
              synopsis: parsed.synopsis || '',
              triggerPrompt: parsed.triggerPrompt || '',
              unlockLevel,
              isFcOnly: isFC,
              bgmType: BGM_BY_CHAPTER[chapterNum] || 'adventure',
              coinReward: chapterNum >= 5 ? 20 : 10,
              isActive: true,
            },
          });

          charResult.push(chapterNum);
          generated++;
        } catch (err) {
          console.error(`[story] ${char.name} ch${chapterNum}:`, err);
        }
      }

      if (charResult.length > 0) {
        results.push({ name: char.name, chapters: charResult });
      }
    }

    return NextResponse.json({
      message: 'Story chapters generated',
      generated,
      characters: results,
      bgreset: '既存章のBGMを設定済み',
    });
  } catch (err) {
    console.error('[generate-story-chapters] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
