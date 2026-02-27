'use client';

import { useEffect } from 'react';

export function PushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        // Service Worker登録
        const registration = await navigator.serviceWorker.register('/push-sw.js');

        // 既に通知許可済みなら、subscription も確認・登録
        if (Notification.permission === 'granted') {
          let subscription = await registration.pushManager.getSubscription();

          // subscriptionがなければ新規作成
          if (!subscription) {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (vapidKey) {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey,
              });
            }
          }

          // サーバーに登録
          if (subscription) {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription: subscription.toJSON() }),
            });
          }
        }
      } catch (err) {
        console.warn('[PushSetup] failed:', err);
      }
    })();
  }, []);

  return null;
}
