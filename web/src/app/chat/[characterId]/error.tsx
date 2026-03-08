'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Server Actionの不一致エラー → 自動リロードでキャッシュ更新
    if (
      error.message?.includes('Failed to find Server Action') ||
      error.message?.includes('older or newer deployment') ||
      error.message?.includes('module factory')
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      {/* 背景グロー */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] bg-pink-900/15 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 text-center px-6 max-w-sm"
      >
        {/* アイコン */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--color-surface)] border border-white/5 flex items-center justify-center shadow-lg shadow-purple-900/20"
        >
          <span className="text-3xl">💬</span>
        </motion.div>

        {/* メッセージ */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-[var(--color-text)] font-medium mb-2"
        >
          ...ちょっと接続が乱れちゃった
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-[var(--color-muted)] mb-8"
        >
          もう一回タップすれば繋がるよ
        </motion.p>

        {/* ボタン */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={reset}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium text-white 
                       shadow-lg shadow-purple-900/30 active:scale-[0.97] transition-transform"
          >
            もう一度試す
          </button>
          <a
            href="/chat"
            className="block w-full px-6 py-3.5 bg-[var(--color-surface)] border border-white/5 rounded-xl font-medium text-[var(--color-muted)]
                       active:scale-[0.97] transition-transform"
          >
            キャラ選択に戻る
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
