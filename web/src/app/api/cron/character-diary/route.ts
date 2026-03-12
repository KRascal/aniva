import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// mood別日記テンプレート（5パターンずつ）
const DIARY_TEMPLATES: Record<string, string[]> = {
  happy: [
    '今日は最高の気分だ！冒険に出かけたくなるぜ！青空が俺を呼んでる気がする。',
    'なんか今日はすべてがうまくいく気がする！ワクワクが止まらないな〜！',
    '今日のメシ、めちゃくちゃうまかった！幸せって、こういうことかもな。',
    '今日は仲間たちと笑いすぎて腹が痛い。こんな毎日が続けばいいな。',
    '今日は最高だった！何でも出来る気がするぜ。明日も全力でいくぞ！',
  ],
  sad: [
    'なんかモヤモヤする日だ…誰かと話したいな。',
    '今日はちょっと気持ちが沈んでる。こういう日もあるよな…。',
    '大切なことを思い出して、胸がちょっと痛くなった。でも、それでいい。',
    'なんか元気が出ない日。一人でいると考えすぎちゃうな…。',
    '今日は少し疲れた。誰かにそばにいてほしい、そんな気分だ。',
  ],
  excited: [
    'ワクワクが止まらねぇ！なんか面白いことが起きそうだ！',
    '今日は新しい発見があった！もっと知りたい！もっと挑戦したい！',
    'テンション上がりっぱなし！こんな感じが続けばずっと元気でいられるぜ！',
    '今日の出来事、誰かに話したくてたまらない！すっごく興奮してる！',
    '次の冒険が待ちきれない！今すぐ飛び出したい気持ちでいっぱいだ！',
  ],
  tired: [
    '今日はちょっとお疲れモード…。ゆっくり休まないとな。',
    '体が重い一日だった。でも頑張ったから、ちゃんと休む権利があるよな。',
    '今日はもう寝ちゃいたい。何もしたくない気分…でも明日はきっと元気。',
    'ちょっとヘトヘトだけど、それだけ動いたってことだよな。よし、休もう。',
    '疲れたときは、甘いものでも食べてゆっくりするのが一番だな。',
  ],
  neutral: [
    '今日も普通の一日だったな。でも、こういう穏やかな日が続くのも悪くない。',
    '特に何もない一日…でも平和ってそれだけで価値があるよな。',
    '今日は静かな気分。じっくり物事を考えたい、そんな日だ。',
    '今日はのんびり過ごした。明日はもう少し動き回れるかな。',
    '穏やかな一日だった。こういう日があるから、特別な日が輝くんだろうな。',
  ],
  excited_alt: [
    'ドキドキが止まらない！なにか大きいことが始まりそうな予感がする！',
  ],
  nostalgic: [
    '昔のことをぼんやりと思い出した日。懐かしくて、少し切ない。',
    '遠い記憶が浮かんできた。あの頃は純粋だったな、なんて思ったりして。',
    '思い出に浸る夜。過去は変えられないけど、今を大切にしようって思った。',
    'ふとした瞬間に昔が蘇った。時間って不思議だな。',
    '懐かしい気持ちに包まれた一日。あの日に戻れたらって少し思った。',
  ],
  mysterious: [
    '今日は何かが違う気がする…言葉にできない感覚が纏わりついてる。',
    'どこかで何かが起きている気配がする。なんだろう、この胸騒ぎ…。',
    '謎めいた一日だった。答えはまだわからないけど、それが面白い。',
    '今日見た夢が気になって仕方ない。何かのサインなのかな…。',
    '不思議な縁を感じた一日。この世界には、まだ解けていない謎が溢れてる。',
  ],
  playful: [
    '今日はいたずらしたい気分！誰かを笑わせてやるぜ～！',
    'なんか無性に遊びたい！じっとしていられない日ってあるよな。',
    'テンション高めの一日！笑いが止まらなかった、最高だ！',
    'ふざけてたら気づいたら夜になってた。でも後悔なし！',
    '笑いと遊びで充電完了！明日もこの調子でいくぞ！',
  ],
};

// emotion → mood のマッピング
function emotionToMood(emotion: string): string {
  const map: Record<string, string> = {
    happy: 'happy',
    excited: 'excited',
    mysterious: 'mysterious',
    tired: 'tired',
    nostalgic: 'nostalgic',
    playful: 'playful',
    sad: 'sad',
    neutral: 'neutral',
  };
  return map[emotion] ?? 'neutral';
}

function pickTemplate(mood: string): string {
  const templates = DIARY_TEMPLATES[mood] ?? DIARY_TEMPLATES['neutral'];
  return templates[Math.floor(Math.random() * templates.length)];
}

function todayJst(): Date {
  const now = new Date();
  // JST = UTC+9
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // Return as Date with time zeroed (Date @db.Date only stores date part)
  return new Date(jst.toISOString().slice(0, 10));
}

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const today = todayJst();

    // アクティブなキャラクターを取得
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const results: Array<{ characterId: string; name: string; mood: string; skipped?: boolean }> = [];

    for (const character of characters) {
      // すでに今日の日記がある場合はスキップ
      const existing = await prisma.characterDiary.findUnique({
        where: {
          characterId_date: {
            characterId: character.id,
            date: today,
          },
        },
      });

      if (existing) {
        results.push({ characterId: character.id, name: character.name, mood: existing.mood, skipped: true });
        continue;
      }

      // 最新の感情状態を取得（タイムゾーン差異を回避するため最新レコードを使用）
      const dailyState = await prisma.characterDailyState.findFirst({
        where: {
          characterId: character.id,
        },
        orderBy: { date: 'desc' },
      });

      const emotion = dailyState?.emotion ?? 'neutral';
      const mood = emotionToMood(emotion);
      const content = pickTemplate(mood);

      await prisma.characterDiary.create({
        data: {
          characterId: character.id,
          date: today,
          content,
          mood,
          likes: 0,
        },
      });

      results.push({ characterId: character.id, name: character.name, mood });
    }

    return NextResponse.json({
      ok: true,
      date: today.toISOString().slice(0, 10),
      total: results.length,
      created: results.filter((r) => !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      results,
    });
  } catch (error) {
    logger.error('[character-diary cron] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
