/**
 * web-push-sender.ts
 * Web Push 送信ヘルパー
 * character-notify/route.ts から抽出・汎用化
 */

import webpush from 'web-push';
import { prisma } from './prisma';

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * 指定ユーザーへ Web Push 通知を送信する。
 * 失敗したエンドポイントは DB から自動削除する。
 *
 * @returns { sent: number, failed: number }
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string,
): Promise<{ sent: number; failed: number }> {
  ensureVapid();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushPayload = { title, body, url };
  const payloadStr = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr,
      ),
    ),
  );

  const failedEndpoints: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      failedEndpoints.push(subscriptions[index].endpoint);
    }
  });

  // 失敗したサブスクリプションを削除
  if (failedEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: failedEndpoints } },
    });
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = failedEndpoints.length;

  return { sent, failed };
}
