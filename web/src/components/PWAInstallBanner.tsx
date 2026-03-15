'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * PWAインストール促進バナー
 * モバイルブラウザでアクセスしたユーザーにホーム画面追加と通知許可を促す
 */
export function PWAInstallBanner() {
  const t = useTranslations('pwa');
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    // すでにPWAとして実行中なら表示しない
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // 24時間以内に閉じていたら表示しない
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    // 通知許可状態を取得
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    // iOS判定
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Android/Chrome: beforeinstallprompt イベント
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: 3回目のアクセスで表示
    if (isIOSDevice) {
      const visitCount = parseInt(localStorage.getItem('visit-count') || '0') + 1;
      localStorage.setItem('visit-count', String(visitCount));
      if (visitCount >= 3) setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 通知許可済みならバナー不要
  if (notifPermission === 'granted') return null;

  const handleInstall = async () => {
    if (deferredPrompt && 'prompt' in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
    dismiss();
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        setShow(false);
      }
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-banner-dismissed', String(Date.now()));
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-40"
        >
          <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-purple-900/30">
            <button onClick={dismiss} className="absolute top-2 right-3 text-gray-500 hover:text-gray-300 text-lg">×</button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">
                  {notifPermission === 'default' ? '推しからのメッセージを見逃さない' : t('addToHome')}
                </p>
                <p className="text-[var(--color-muted)] text-xs">
                  {isIOS ? t('iosGuide') : t('androidGuide')}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {notifPermission === 'default' && (
                  <button
                    onClick={handleEnableNotifications}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl text-white text-xs font-bold
                               active:scale-95 transition-transform whitespace-nowrap"
                  >
                    通知を許可
                  </button>
                )}
                {!isIOS && deferredPrompt && (
                  <button
                    onClick={handleInstall}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white text-xs font-bold
                               active:scale-95 transition-transform"
                  >
                    {t('add')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
