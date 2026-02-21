import webpush from 'web-push';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  try {
    // 内部シークレットトークン認証（cronジョブからのみ呼び出し可）
    const token = req.headers.get('x-internal-secret');
    if (!token || token !== process.env.INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, title, body, url } = await req.json();

    // userId未指定での全体配信は明示的なフラグが必要（誤爆防止）
    if (!userId && !req.headers.get('x-broadcast-all')) {
      return NextResponse.json(
        { error: 'userId is required. For broadcast, set x-broadcast-all header.' },
        { status: 400 },
      );
    }

    const where = userId ? { userId } : {};
    const subscriptions = await prisma.pushSubscription.findMany({ where });

    const payload = JSON.stringify({ title, body, url: url || '/chat' });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ success, failed, total: subscriptions.length });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
