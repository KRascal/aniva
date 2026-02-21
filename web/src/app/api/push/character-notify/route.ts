import webpush from 'web-push';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const LUFFY_PROACTIVE_MESSAGES = {
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

export async function POST() {
  try {
    const timeOfDay = getTimeOfDay();
    const messageBody = pickRandom(LUFFY_PROACTIVE_MESSAGES[timeOfDay]);

    // 全サブスクリプション取得
    const subscriptions = await prisma.pushSubscription.findMany();

    const payload = JSON.stringify({
      title: 'ルフィからメッセージ 🏴‍☠️',
      body: messageBody,
      url: '/chat',
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    );

    // 失敗した（期限切れの）サブスクリプションを削除
    const failedEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedEndpoints.push(subscriptions[index].endpoint);
      }
    });

    if (failedEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: failedEndpoints } },
      });
    }

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      ok: true,
      timeOfDay,
      success,
      failed,
      total: subscriptions.length,
      cleanedUp: failedEndpoints.length,
    });
  } catch (error) {
    console.error('Character notify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
