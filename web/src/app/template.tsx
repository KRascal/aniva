'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * App Router ページ遷移アニメーション
 * template.tsx は各ナビゲーションで再マウントされるため、
 * ページ切り替え時に毎回フェードイン効果が発生する。
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier — Apple風のイージング
      }}
    >
      {children}
    </motion.div>
  );
}
