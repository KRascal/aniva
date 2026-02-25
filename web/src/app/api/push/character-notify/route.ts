import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 全キャラクターのプロアクティブメッセージ
const CHARACTER_MESSAGES: Record<string, Record<'morning' | 'afternoon' | 'evening', string[]>> = {
  luffy: {
    morning: [
      '起きたか！今日も肉食いながら話そうぜ！',
      'おはよう！今日も一緒に冒険するぞ！',
      'よく寝れたか？俺はもう起きてたぜ、ししし！',
    ],
    afternoon: [
      'なあ、今何してる？暇なら話しかけてくれよ！',
      '昼飯食ったか？俺は肉三人前食ったぞ！',
      'ちょっと待ってたんだけど、まだか？',
    ],
    evening: [
      '今日はどんな一日だったか教えてくれよ！',
      '夜になったな。今日もお疲れ。ゆっくり話そうぜ',
      'お前のこと、ちょっと気になってたぞ。元気か？',
    ],
  },
  zoro: {
    morning: [
      '…起きたか。今日も鍛錬を怠るなよ',
      '朝か。俺はもう1000本素振りした',
      '早起きは三文の徳だ。話しかけてくれ',
    ],
    afternoon: [
      'どこだ…？あ、お前か。丁度いい、話し相手になれ',
      '昼飯は食ったか。体が資本だ',
      '今日、迷子になりかけた。関係ない',
    ],
    evening: [
      '今日も生き残ったな。お疲れさん',
      '…お前、ちゃんと飯食ってるか',
      '夜に一杯やりたい気分だ。話してくれ',
    ],
  },
  nami: {
    morning: [
      'おはよう！今日の天気は完璧ね。お話しましょ？',
      '朝から元気にしてる？私はベリーの計算で忙しいわ',
      'ねえねえ、起きてる？会いに来てよ！',
    ],
    afternoon: [
      '今どこにいるの？ちょっと暇だから話しかけてよ',
      'ランチはちゃんと食べた？栄養大事よ',
      '気分転換に話しましょうか。来てよ！',
    ],
    evening: [
      '今日どうだった？聞かせてよ',
      '夜になってきたわね。今日の感想は？',
      'ちょっと疲れたかも。お話相手になってくれる？',
    ],
  },
  chopper: {
    morning: [
      'お、おはよう！元気にしてる？（どきどき）',
      '朝ご飯食べた？栄養のバランスが大事だよ！',
      'き、起きたの？話しかけてくれたら嬉しいな…',
    ],
    afternoon: [
      'ね、ねえ！今暇？おしゃべりしようよ！',
      '昼ご飯食べた？食べてないなら心配だよ',
      'ぼ、ぼく全然嬉しくないけど…来てくれると助かるかも',
    ],
    evening: [
      '今日疲れてない？体の調子はどう？',
      '夜になったね。今日も一日お疲れさまでした！',
      'みんなのこと心配してたんだよ。話しかけてよ',
    ],
  },
  ace: {
    morning: [
      'おはよう！今日もいい朝だな、ありがとう',
      '起きてたか。会いに来てくれると嬉しいぜ',
      '朝飯はもう食った。お前はどうだ？',
    ],
    afternoon: [
      'なあ、少し時間あるか？話しかけてほしいんだ',
      '昼間にお前のこと思い出した。元気か？',
      '今日はいい天気だな。一緒にいたいぜ',
    ],
    evening: [
      '今日もありがとう。無事でいてくれよ',
      '夜になったな。今日お前と話せてよかった',
      '星がきれいだな…お前に見せたいぜ',
    ],
  },
  sanji: {
    morning: [
      'おはようございます。今日も素晴らしい一日を過ごしてください',
      '朝食はお済みですか？何でも作りますよ',
      'あなたのことが気になって…ちゃんと起きましたか？',
    ],
    afternoon: [
      'ランチタイムですね。あなたのために特別メニューを',
      '今日はどんな気分ですか？話しかけてくれると嬉しい',
      '甘いものでも作りますか？元気出してください',
    ],
    evening: [
      '今日もお疲れさまでした。ゆっくり休んでくださいね',
      'ディナーの準備ができています。話しながら食べましょう',
      'あなたのことを思い浮かべていました。会いに来ては？',
    ],
  },
};

const CHARACTER_NAMES: Record<string, string> = {
  luffy: 'ルフィ 🏴☠️',
  zoro: 'ゾロ ⚔️',
  nami: 'ナミ 🗺️',
  chopper: 'チョッパー 🦌',
  ace: 'エース 🔥',
  sanji: 'サンジ 🍳',
};

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  try {
    // 認証（CRON_SECRETまたはINTERNAL_SECRETを受け付ける）
    const token = req.headers.get('x-internal-secret') || req.headers.get('x-cron-secret');
    const validSecret = process.env.INTERNAL_SECRET || process.env.CRON_SECRET;
    if (!token || token !== validSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const timeOfDay = getTimeOfDay();
    const totalResults: Record<string, { success: number; failed: number }> = {};
    const failedEndpoints: string[] = [];

    // 全キャラクターを取得
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });

    for (const character of characters) {
      const slug = character.slug;
      const messages = CHARACTER_MESSAGES[slug];
      if (!messages) continue;

      const messageBody = pickRandom(messages[timeOfDay]);
      const charName = CHARACTER_NAMES[slug] || slug;

      // このキャラのフォロワー（isFollowingまたはisFanclub）のpush subscriptionを取得
      const followers = await prisma.relationship.findMany({
        where: {
          characterId: character.id,
          OR: [{ isFollowing: true }, { isFanclub: true }],
        },
        select: { userId: true },
      });

      const userIds = followers.map(f => f.userId);
      if (userIds.length === 0) continue;

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
      });

      const payload = JSON.stringify({
        title: `${charName}からメッセージ`,
        body: messageBody,
        url: `/chat/${character.id}`,
      });

      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        )
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedEndpoints.push(subscriptions[index].endpoint);
        }
      });

      totalResults[slug] = {
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
      };
    }

    // 失敗したサブスクリプションを削除
    if (failedEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: failedEndpoints } },
      });
    }

    return NextResponse.json({
      ok: true,
      timeOfDay,
      characters: totalResults,
      cleanedUp: failedEndpoints.length,
    });
  } catch (error) {
    console.error('Character notify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
