'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * プッシュ通知登録コンポーネント
 * チャット画面の初回訪問時 or 設定画面から呼び出す
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type PushState = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'unsupported';

interface PushNotificationSetupProps {
  characterName?: string;
  characterSlug?: string;
  onSubscribed?: () => void;
  variant?: 'banner' | 'button';
}

export function PushNotificationSetup({
  characterName,
  characterSlug,
  onSubscribed,
  variant = 'banner',
}: PushNotificationSetupProps) {
  const [state, setState] = useState<PushState>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    // 既に許可済みか確認
    if (Notification.permission === 'granted') {
      setState('subscribed');
    } else if (Notification.permission === 'denied') {
      setState('denied');
    }
    // 一度dismissしたら24時間表示しない
    const dismissedAt = localStorage.getItem('aniva_push_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 86400000) {
      setDismissed(true);
    }
  }, []);

  const subscribe = useCallback(async () => {
    setState('requesting');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      // SWを登録
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Push購読
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // バックエンドに購読情報を保存
      const subJson = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        }),
      });

      setState('subscribed');
      onSubscribed?.();
    } catch (err) {
      console.error('Push subscription failed:', err);
      setState('idle');
    }
  }, [onSubscribed]);

  const dismiss = useCallback(() => {
    localStorage.setItem('aniva_push_dismissed', String(Date.now()));
    setDismissed(true);
  }, []);

  // unsupported or already subscribed or dismissed → 非表示
  if (state === 'unsupported' || dismissed) return null;
  if (state === 'subscribed' && variant === 'banner') return null;

  if (variant === 'button') {
    return (
      <button
        onClick={subscribe}
        disabled={state === 'requesting' || state === 'denied'}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
      >
        🔔 {state === 'subscribed' ? '通知ON' : state === 'denied' ? '通知拒否済み' : '通知を受け取る'}
      </button>
    );
  }

  // banner variant
  if (state === 'idle') {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-2">
        <div className="bg-gray-900/95 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">🔔</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">
                {characterName ? `${characterName}からのメッセージを受け取る` : 'キャラからの通知を受け取る'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                アプリを閉じていても、推しから連絡が届きます
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={subscribe}
              disabled={state === 'requesting'}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {state === 'requesting' ? '設定中...' : '受け取る'}
            </button>
            <button
              onClick={dismiss}
              className="px-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
