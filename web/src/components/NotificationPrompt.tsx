'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationPromptProps {
  characterName: string;
  characterAvatarUrl?: string | null;
}

/**
 * チャットページ初回訪問時に表示される通知許可プロンプト
 * キャラのアバターと名前でリアルタイム受信を訴求する
 */
export function NotificationPrompt({ characterName, characterAvatarUrl }: NotificationPromptProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 通知非対応ブラウザはスキップ
    if (!('Notification' in window)) return;
    // すでに許可/拒否済みならスキップ
    if (Notification.permission !== 'default') return;
    // 一度でも表示済みならスキップ
    if (localStorage.getItem('aniva_notif_prompted')) return;

    // 少し遅らせて表示（ページロード直後に被らないよう）
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    localStorage.setItem('aniva_notif_prompted', '1');
    setShow(false);
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  };

  const handleLater = () => {
    localStorage.setItem('aniva_notif_prompted', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* 背景オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleLater}
          />

          {/* プロンプトカード */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-4 right-4 bottom-1/3 z-50 mx-auto max-w-sm"
          >
            <div className="bg-[var(--color-surface,#1a1130)] border border-white/15 rounded-3xl p-6 shadow-2xl shadow-purple-900/50 text-center">
              {/* アバター */}
              <div className="flex justify-center mb-4">
                {characterAvatarUrl ? (
                  <div className="relative">
                    <img
                      src={characterAvatarUrl}
                      alt={characterName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-purple-500/60 shadow-lg shadow-purple-500/30"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xl">💬</span>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl border-4 border-purple-500/60 shadow-lg shadow-purple-500/30">
                    🌟
                  </div>
                )}
              </div>

              {/* メインコピー */}
              <h3 className="text-white text-lg font-bold mb-2 leading-snug">
                {characterName}からのメッセージを<br />リアルタイムで受け取る
              </h3>
              <p className="text-[var(--color-muted,#9ca3af)] text-sm mb-6 leading-relaxed">
                通知をオンにすると、{characterName}が<br />
                あなたにDMを送ってきたときにすぐ気づける。
              </p>

              {/* ボタン群 */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAllow}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white text-sm font-bold
                             active:scale-95 transition-transform shadow-lg shadow-purple-500/30"
                >
                  🔔 通知を許可する
                </button>
                <button
                  onClick={handleLater}
                  className="w-full py-2.5 text-[var(--color-muted,#9ca3af)] text-sm font-medium
                             active:opacity-70 transition-opacity"
                >
                  後で
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
