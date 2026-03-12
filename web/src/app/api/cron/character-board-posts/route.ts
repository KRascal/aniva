import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { generateText, cleanGeneratedText } from '@/lib/llm';

/**
 * キャラ自発書き込み Cron — コミュニティ掲示板（FanThread）
 * キャラが自分のファン掲示板にスレッドを立てる → 「キャラが掲示板に本当にいる」体験
 * 
 * 6時間おきに実行。各キャラが20%の確率で投稿（1日0-1投稿/キャラ程度）
 */

const HOUR = new Date().getHours();

// 時間帯別のスレッドテーマ
function getThreadThemes(): string[] {
  if (HOUR >= 5 && HOUR < 11) {
    return [
      '今日の目標',
      '朝起きて思ったこと',
      '最近ハマってること',
      'おすすめの朝ごはん',
      '今日やりたいこと',
    ];
  }
  if (HOUR >= 11 && HOUR < 17) {
    return [
      'お昼休みの雑談',
      '最近気になること',
      'みんなに聞きたいこと',
      '今日の発見',
      'おすすめ教えて',
    ];
  }
  if (HOUR >= 17 && HOUR < 22) {
    return [
      '今日の振り返り',
      '最近嬉しかったこと',
      'みんなは夜何してる？',
      '最近のマイブーム',
      '明日への意気込み',
    ];
  }
  return [
    '眠れない夜の雑談',
    'ちょっと聞いてほしい話',
    '深夜のつぶやき',
    '夜だから言えること',
    '最近考えてること',
  ];
}

// カテゴリ選択（重み付き）
function pickCategory(): string {
  const r = Math.random();
  if (r < 0.40) return 'general';
  if (r < 0.65) return 'discussion';
  if (r < 0.80) return 'question';
  if (r < 0.95) return 'event';
  return 'fanart';
}

export async function GET(req: NextRequest) {
  try {
    const authError = verifyCronAuth(req);
    if (authError) return authError;

    // アクティブキャラ取得
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        systemPrompt: true,
      },
    });

    if (characters.length === 0) {
      return NextResponse.json({ success: true, created: [], message: 'No active characters' });
    }

    const themes = getThreadThemes();
    const created: Array<{ characterName: string; title: string; category: string }> = [];
    const MAX_POSTS = 3; // 1回のcronで最大3スレッド

    for (const char of characters) {
      if (created.length >= MAX_POSTS) break;

      // 20%の確率で投稿
      if (Math.random() > 0.20) continue;

      // 直近24hに同キャラが既にスレッドを立てていたらスキップ
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentThread = await prisma.fanThread.findFirst({
        where: {
          characterId: char.id,
          userId: null, // キャラが立てたスレッド
          createdAt: { gte: since24h },
        },
      });
      if (recentThread) continue;

      const theme = themes[Math.floor(Math.random() * themes.length)];
      const category = pickCategory();

      try {
        const systemPromptCore = (char.systemPrompt || '').split(/\n##/)[0].trim();
        const systemMessage = `${systemPromptCore}\n\n重要: SNS掲示板のスレッドタイトルと本文を書け。\nフォーマット:\nタイトル: <タイトル>\n本文: <本文>\n\nタイトルは20文字以内。本文は50〜150文字。キャラの口調で自然に書け。口調ルールや説明文は絶対に出力しない。`;
        const userMessage = `テーマ「${theme}」で${char.name}らしいファン掲示板のスレッドを立ててください。ファンに語りかけるような自然な投稿で。`;

        const rawContent = await generateText(systemMessage, userMessage);
        if (!rawContent) continue;

        const cleaned = cleanGeneratedText(rawContent);
        if (!cleaned) continue;

        // パース: "タイトル: xxx\n本文: yyy" or "タイトル: xxx 本文: yyy"
        const titleMatch = cleaned.match(/タイトル[:：]\s*(.+?)(?:\s*本文[:：]|$)/);
        const bodyMatch = cleaned.match(/本文[:：]\s*([\s\S]+)/);

        const title = titleMatch
          ? titleMatch[1].trim().replace(/\s*本文[:：].*/, '').slice(0, 100)
          : cleaned.split(/\n/)[0].slice(0, 50);
        const content = bodyMatch
          ? bodyMatch[1].trim().slice(0, 500)
          : cleaned.replace(/^タイトル[:：].*?\n?/, '').slice(0, 500);

        await prisma.fanThread.create({
          data: {
            characterId: char.id,
            userId: null, // キャラが立てたスレッド
            title,
            content,
            category,
          },
        });

        created.push({ characterName: char.name, title, category });
      } catch (err) {
        console.error(`Board post failed for ${char.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      count: created.length,
    });
  } catch (err) {
    console.error('Cron character-board-posts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
