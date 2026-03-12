import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { generateText, cleanGeneratedText } from '@/lib/llm';

/**
 * キャラ自発ストーリーズ投稿 Cron
 * Instagramストーリーズのように、キャラが短い「今」を投稿
 * Momentとして保存 → /stories に72時間表示される
 * 
 * 4時間おきに実行。各キャラが30%の確率で投稿
 * autonomous-postとは別軸: こちらはストーリーズ特化（短く、問いかけ、リアルタイム感）
 */

const HOUR = new Date().getHours();

// ストーリーズ特有のプロンプトテンプレート（短文・問いかけ型）
function getStoryPrompts(): string[] {
  if (HOUR >= 5 && HOUR < 11) {
    return [
      'おはよう系の一言（ファンへの問いかけ付き）',
      '朝の瞬間を切り取った呟き',
      '今日の気分を一言で表現',
      '朝ごはん報告（ファンに「何食べた？」と聞く）',
    ];
  }
  if (HOUR >= 11 && HOUR < 17) {
    return [
      '今何してるかのリアルタイム報告',
      'ファンへの質問（二択 or 自由回答）',
      'ちょっとした発見・驚きの共有',
      '仲間のキャラについての一言（クロスオーバー感）',
    ];
  }
  if (HOUR >= 17 && HOUR < 22) {
    return [
      '夕方の気分や景色の共有',
      '今日あったことの振り返り',
      'ファンに「おつかれ」を伝える',
      '夜の予定や楽しみについて',
    ];
  }
  return [
    '夜の静かな時間の呟き',
    '寝る前のファンへのメッセージ',
    'ちょっとしんみりした一言',
    '明日への期待',
  ];
}

export async function GET(req: NextRequest) {
  try {
    const authError = verifyCronAuth(req);
    if (authError) return authError;

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

    const prompts = getStoryPrompts();
    const created: Array<{ characterName: string; content: string }> = [];
    const MAX_STORIES = 5; // 1回で最大5投稿

    // キャラをシャッフル（多様性確保）
    const shuffled = [...characters].sort(() => Math.random() - 0.5);

    for (const char of shuffled) {
      if (created.length >= MAX_STORIES) break;

      // 30%の確率で投稿
      if (Math.random() > 0.30) continue;

      // 直近4hに同キャラがストーリーズ投稿していたらスキップ
      const since4h = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const recentStory = await prisma.moment.findFirst({
        where: {
          characterId: char.id,
          publishedAt: { gte: since4h },
        },
        orderBy: { publishedAt: 'desc' },
      });
      if (recentStory) continue;

      const prompt = prompts[Math.floor(Math.random() * prompts.length)];

      try {
        const systemPromptCore = (char.systemPrompt || '').split(/\n##/)[0].trim();
        const systemMessage = `${systemPromptCore}\n\n重要: Instagramストーリーズ風の超短文（1〜2文、最大80文字）を出力せよ。\nルール:\n- ファンに語りかける or 問いかける内容\n- 絵文字は最大1個まで\n- 口調ルールや説明文は絶対に出力しない\n- 「今」のリアルタイム感を重視`;
        const userMessage = `テーマ「${prompt}」で${char.name}がストーリーズに投稿する超短文を書け。80文字以内。`;

        const rawContent = await generateText(systemMessage, userMessage);
        if (!rawContent) continue;

        const content = cleanGeneratedText(rawContent);
        if (!content || content.length > 200) continue;

        // FC限定を10%の確率で
        const isFcOnly = Math.random() < 0.10;

        await prisma.moment.create({
          data: {
            characterId: char.id,
            type: 'TEXT',
            content,
            visibility: 'PUBLIC',
            isFcOnly,
            publishedAt: new Date(),
          },
        });

        created.push({ characterName: char.name, content });
      } catch (err) {
        console.error(`Story post failed for ${char.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      count: created.length,
    });
  } catch (err) {
    console.error('Cron character-stories error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
