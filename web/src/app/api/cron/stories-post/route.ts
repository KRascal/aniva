import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/llm';
import { logger } from '@/lib/logger';
import { getAutoPostsConfig } from '@/app/api/admin/auto-posts/route';

/**
 * ストーリーズ自発投稿Cron
 * Instagramストーリーズ風の短い一言・リアルタイム感のあるMomentを生成
 * autonomous-postとの違い:
 *  - より短く（1文）、よりリアルタイム感（「今〜してる」系）
 *  - 高頻度・低確率（2時間おき × 20%）
 *  - ストーリーズバーを常に最新で埋める目的
 */

const STORY_PROMPTS: Record<string, string> = {
  morning: '朝の瞬間をリアルタイムで共有する一言（「今〜してる」系）',
  afternoon: '昼の何気ない瞬間を切り取った一言',
  evening: '夕方のリラックスした瞬間の一言',
  night: '夜の静かな時間に思ったことの一言',
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
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
    const storyGuide = STORY_PROMPTS[timeOfDay] || STORY_PROMPTS.afternoon;
    let postedCount = 0;

    // 自動投稿設定を取得（normalRatioでFC限定比率を決定）
    const autoPostsConfig = await getAutoPostsConfig().catch(() => null);

    for (const character of characters) {
      // 20%の確率（2時間おき × 20% = 約2.4件/日/キャラ）
      if (Math.random() > 0.20) continue;

      // 最低2時間インターバル
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentStory = await prisma.moment.findFirst({
        where: {
          characterId: character.id,
          type: 'TEXT',
          publishedAt: { gte: twoHoursAgo },
        },
      });
      if (recentStory) continue;

      // 今日のストーリー投稿数チェック（最大4件/日）
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStories = await prisma.moment.count({
        where: {
          characterId: character.id,
          publishedAt: { gte: todayStart },
          type: 'TEXT',
        },
      });
      if (todayStories >= 4) continue;

      // 直近ストーリー取得（重複回避）
      const recentPosts = await prisma.moment.findMany({
        where: { characterId: character.id, content: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: { content: true },
      });
      const recentTexts = recentPosts.map((m, i) => `${i + 1}. ${m.content}`).join('\n');

      try {
        const systemPromptCore = (character.systemPrompt || character.name).split(/\n##/)[0].trim();
        const systemMessage = `${systemPromptCore}\n\n重要: ストーリーズ用の超短い一言のみを出力。説明・前置き・後書き・引用符一切不要。`;
        const userMessage = `あなたは${character.name}として、Instagramストーリーズ風の超短い一言（1文、20〜50文字）を投稿します。
テーマ: ${storyGuide}
時間帯: ${timeOfDay === 'morning' ? '朝' : timeOfDay === 'afternoon' ? '昼' : timeOfDay === 'evening' ? '夕方' : '夜'}
過去の投稿（被らないように）:
${recentTexts || '（なし）'}

リアルタイム感のある超短い一言のみ返答。「今まさにこの瞬間」の感覚で。`;

        let content = await generateText(systemMessage, userMessage, { maxTokens: 80, temperature: 0.95 });
        if (!content) continue;

        // 引用符除去
        content = content.replace(/^[「『"]|[」』"]$/g, '').trim();
        if (!content || content.length < 5) continue;

        // publishedAtを過去0〜30分にずらす
        const randomMinutesAgo = Math.floor(Math.random() * 30);
        const staggeredPublishedAt = new Date(Date.now() - randomMinutesAgo * 60 * 1000);

        // normalRatioに基づいてFC限定比率を決定
        // normalRatio=85 → NORMAL:85%, FC限定(PREMIUM):15%
        const charConfig = autoPostsConfig?.characters?.[character.id];
        const normalRatio = charConfig?.normalRatio ?? autoPostsConfig?.defaultNormalRatio ?? 85;
        const isFcOnly = Math.random() * 100 >= normalRatio;

        await prisma.moment.create({
          data: {
            characterId: character.id,
            type: 'TEXT',
            content: content.slice(0, 300),
            visibility: isFcOnly ? 'PREMIUM' : 'PUBLIC',
            isFcOnly,
            publishedAt: staggeredPublishedAt,
          },
        });

        postedCount++;
      } catch (e) {
        logger.error(`[stories-post] ${character.name} error:`, e);
        continue;
      }
    }

    return NextResponse.json({
      posted: postedCount,
      totalCharacters: characters.length,
      timeOfDay,
    });
  } catch (error) {
    logger.error('[stories-post] Cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
