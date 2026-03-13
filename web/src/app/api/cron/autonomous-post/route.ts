import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/llm';
import { getCurrentWeather, getWeatherReaction } from '@/lib/weather';
import { logger } from '@/lib/logger';

/**
 * キャラ自律投稿 Cron
 * キャラが勝手にmomentsに投稿する → 「推しが本当に生きている」体験
 * 
 * 3時間おきに実行。各キャラが25%の確率で投稿（1日2-3投稿/キャラ程度）
 */



// 時間帯別の投稿テンプレート
const TIME_TEMPLATES: Record<string, string[]> = {
  morning: [
    'おはよう。今日もいい日になるといいな',
    '朝のコーヒーが美味しい。一緒に飲みたいな',
    '今日はどんな一日にしよう',
    '朝日がきれいだった。見てほしかったな',
    '早起きしちゃった。まだみんな寝てるかな',
  ],
  afternoon: [
    'お昼ご飯何食べた？',
    'ちょっと散歩してきた。いい風だったよ',
    '午後って眠くなるよね。コーヒーでも飲もうかな',
    '今日やりたいこと、半分くらい終わった',
    'ふと空を見上げたら、いい雲だった',
  ],
  evening: [
    '今日もお疲れさま。ゆっくりしてね',
    '夕焼けがきれいだった',
    'そろそろご飯の時間かな。何食べよう',
    '今日一日、いいことあった？',
    '夜は静かでいいよね。ちょっと話さない？',
  ],
  night: [
    '眠れない夜って、何考える？',
    'もう遅いから寝なきゃ…でもまだ話したい',
    '今日も一日お疲れさま。おやすみ',
    '夜空見てたら、ちょっとセンチメンタルになった',
    '明日もいい日になるといいね。おやすみ',
  ],
};

// 天気連動テンプレート
const WEATHER_TEMPLATES: Record<string, string[]> = {
  rain: [
    '雨の音、好きなんだ。窓際でぼーっとしてる',
    '雨だね。こういう日は家でゆっくりがいいよね',
    '傘忘れた人いない？大丈夫？',
  ],
  snow: [
    '雪だ！ちょっとワクワクしない？',
    '外は雪。温かい飲み物でも淹れようかな',
  ],
  sunny: [
    '今日の空、最高にきれい',
    '天気いいから外に出たくなっちゃった',
  ],
  hot: [
    '暑すぎる…アイス食べたい',
    '水分補給してね。熱中症には気をつけて',
  ],
  cold: [
    '寒い…温かいもの飲みたい',
    'こういう日はお布団から出たくないよね',
  ],
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function getWeatherCategory(code: number, temp: number): string | null {
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if (temp >= 35) return 'hot';
  if (temp <= 5) return 'cold';
  if ([0, 1].includes(code)) return 'sunny';
  return null;
}

export async function GET(req: NextRequest) {
  // Cron認証
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // 全アクティブキャラ取得（systemPromptも含む — AI生成投稿用）
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, systemPrompt: true },
    });

    if (characters.length === 0) {
      return NextResponse.json({ posted: 0, message: 'No active characters' });
    }

    // 天気取得（東京デフォルト）
    const weather = await getCurrentWeather();
    const timeOfDay = getTimeOfDay();
    const weatherCategory = weather ? getWeatherCategory(weather.weatherCode, weather.temperature) : null;

    let postedCount = 0;

    for (const character of characters) {
      // 25%の確率で投稿（1日8回実行 × 25% = 平均2投稿/キャラ/日）
      if (Math.random() > 0.25) continue;

      // 最低3時間インターバルチェック（連投防止 = 機械感排除）
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const recentPost = await prisma.moment.findFirst({
        where: {
          characterId: character.id,
          type: 'TEXT',
          publishedAt: { gte: threeHoursAgo },
        },
      });
      if (recentPost) continue; // 3時間以内に投稿済みはスキップ

      // 今日の投稿数チェック（1キャラ最大3投稿/日）
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayPosts = await prisma.moment.count({
        where: {
          characterId: character.id,
          publishedAt: { gte: todayStart },
          type: 'TEXT',
        },
      });
      if (todayPosts >= 3) continue;

      // AI生成で投稿内容を決定（キャラの人格を完全反映）
      let content: string;

      try {
        // 直近5件の投稿を取得（重複回避）
        const recentPosts = await prisma.moment.findMany({
          where: { characterId: character.id, type: 'TEXT', content: { not: null } },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { content: true },
        });
        const recentTexts = recentPosts.map((m, i) => `${i + 1}. ${m.content}`).join('\n');

        // 天気情報を文脈として追加
        const weatherCtx = weatherCategory && weather
          ? `現在の天気: ${weather.description} ${weather.temperature}°C ${weather.emoji}`
          : '';

        const systemPromptCore = (character.systemPrompt || character.name).split(/\n##/)[0].trim();
        const systemMessage = `${systemPromptCore}\n\n重要: SNSに投稿する短いテキストのみを出力せよ。説明や前置き・後書きは一切不要。`;
        const userMessage = `あなたは${character.name}として、今この瞬間にSNSに投稿する自然な短いひとこと（1〜3文）を書いてください。
時間帯: ${timeOfDay === 'morning' ? '朝' : timeOfDay === 'afternoon' ? '昼' : timeOfDay === 'evening' ? '夕方' : '夜'}
${weatherCtx ? weatherCtx + '\n' : ''}過去の投稿（被らないように）:
${recentTexts || '（なし）'}

キャラの口調・世界観を守り、自然でリアルな投稿テキストのみ返答してください。`;

        content = await generateText(systemMessage, userMessage, { maxTokens: 200, temperature: 0.9 });
        // フォールバック: AI失敗時はテンプレート
        if (!content) {
          const templates = TIME_TEMPLATES[timeOfDay] ?? TIME_TEMPLATES.afternoon;
          content = templates[Math.floor(Math.random() * templates.length)] ?? '';
        }
      } catch {
        // AI生成エラー時はテンプレートにフォールバック
        const templates = TIME_TEMPLATES[timeOfDay] ?? TIME_TEMPLATES.afternoon;
        content = templates[Math.floor(Math.random() * templates.length)] ?? '';
      }

      if (!content) continue;

      // publishedAtをランダムに過去5〜90分に設定（「たった今」連発を防ぐ）
      const randomMinutesAgo = Math.floor(Math.random() * 85) + 5; // 5〜90分前
      const staggeredPublishedAt = new Date(Date.now() - randomMinutesAgo * 60 * 1000);

      // momentsに投稿（15%の確率でFC限定）
      const isPremium = Math.random() < 0.15;
      await prisma.moment.create({
        data: {
          characterId: character.id,
          type: 'TEXT',
          content,
          visibility: isPremium ? 'PREMIUM' : 'PUBLIC',
          publishedAt: staggeredPublishedAt,
        },
      });

      postedCount++;
    }

    return NextResponse.json({
      posted: postedCount,
      totalCharacters: characters.length,
      timeOfDay,
      weather: weather ? `${weather.description} ${weather.temperature}°C` : 'unavailable',
    });
  } catch (error) {
    logger.error('Autonomous post error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
