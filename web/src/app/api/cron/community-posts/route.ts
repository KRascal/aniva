import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/llm';
import { logger } from '@/lib/logger';

/**
 * コミュニティ掲示板 キャラ自発書き込みCron
 * キャラが自発的にファン掲示板にスレッドを立てる
 * userId: null でキャラ投稿として表示される
 * 
 * 6時間おきに実行。各キャラが15%の確率で投稿（1日1件程度/キャラ）
 */

const THREAD_CATEGORIES = ['general', 'discussion', 'question', 'event'] as const;

// カテゴリ別の投稿ガイド
const CATEGORY_GUIDES: Record<string, string> = {
  general: '日常の出来事や気持ちをシェアする雑談スレッド',
  discussion: 'ファンに意見を聞いたり議論を呼びかけるスレッド',
  question: 'ファンに質問する形式のスレッド（好きな○○は？等）',
  event: '今日の出来事やイベントに関する話題のスレッド',
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return '朝';
  if (hour >= 11 && hour < 17) return '昼';
  if (hour >= 17 && hour < 22) return '夕方';
  return '夜';
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, systemPrompt: true },
    });

    if (characters.length === 0) {
      return NextResponse.json({ posted: 0, message: 'No active characters' });
    }

    const timeOfDay = getTimeOfDay();
    let postedCount = 0;

    for (const character of characters) {
      // 15%の確率で投稿（6時間おき × 15% = 約1件/日/キャラ）
      if (Math.random() > 0.15) continue;

      // 最低12時間インターバル（スレッド連発防止）
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const recentThread = await prisma.fanThread.findFirst({
        where: {
          characterId: character.id,
          userId: null, // キャラ投稿のみ
          createdAt: { gte: twelveHoursAgo },
        },
      });
      if (recentThread) continue;

      // ランダムカテゴリ選択
      const category = THREAD_CATEGORIES[Math.floor(Math.random() * THREAD_CATEGORIES.length)];
      const categoryGuide = CATEGORY_GUIDES[category] || CATEGORY_GUIDES.general;

      // 直近スレッドタイトル取得（重複回避）
      const recentThreads = await prisma.fanThread.findMany({
        where: { characterId: character.id, userId: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true },
      });
      const recentTitles = recentThreads.map((t: { title: string }, i: number) => `${i + 1}. ${t.title}`).join('\n');

      try {
        const systemPromptCore = (character.systemPrompt || character.name).split(/\n##/)[0].trim();

        // タイトル生成
        const titlePrompt = `${systemPromptCore}\n\n重要: ファン掲示板のスレッドタイトルのみを1行で出力せよ。説明不要。`;
        const titleUserMsg = `あなたは${character.name}として、ファン掲示板に新しい${categoryGuide}を立てます。
時間帯: ${timeOfDay}
カテゴリ: ${category}
過去のスレッド（被らないように）:
${recentTitles || '（なし）'}

キャラの口調で自然なスレッドタイトル（20文字以内）を1行だけ返してください。`;

        const title = await generateText(titlePrompt, titleUserMsg, { maxTokens: 50, temperature: 0.9 });
        if (!title) continue;

        // 本文生成
        const contentPrompt = `${systemPromptCore}\n\n重要: ファン掲示板の投稿本文のみを出力せよ。タイトルの繰り返しや説明は不要。`;
        const contentUserMsg = `あなたは${character.name}として、ファン掲示板のスレッド「${title.slice(0, 30)}」の最初の投稿を書きます。
カテゴリ: ${categoryGuide}
時間帯: ${timeOfDay}

キャラの口調で自然な本文（50〜200文字）を書いてください。ファンが返信したくなる内容にしてください。`;

        const content = await generateText(contentPrompt, contentUserMsg, { maxTokens: 300, temperature: 0.85 });
        if (!content) continue;

        await prisma.fanThread.create({
          data: {
            characterId: character.id,
            userId: null, // キャラ投稿
            title: title.replace(/^[「『]|[」』]$/g, '').slice(0, 100),
            content: content.slice(0, 5000),
            category,
            lastReplyAt: new Date(),
          },
        });

        postedCount++;
      } catch (e) {
        logger.error(`[community-posts] ${character.name} error:`, e);
        continue;
      }
    }

    return NextResponse.json({
      posted: postedCount,
      totalCharacters: characters.length,
      timeOfDay,
    });
  } catch (error) {
    logger.error('[community-posts] Cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
