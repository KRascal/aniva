'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface StreakBadgeProps {
  streakDays: number;
  isActive: boolean;
}

export function StreakBadge({ streakDays, isActive }: StreakBadgeProps) {
  if (streakDays === 0 || !isActive) return null;

  if (streakDays >= 30) {
    return (
      <motion.div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/50"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-yellow-400 text-base"
          style={{ filter: 'drop-shadow(0 0 6px gold)' }}
        >
          🔥
        </motion.span>
        <span className="text-xs font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
          {streakDays}日連続中！
        </span>
        <span className="text-xs">✨</span>
      </motion.div>
    );
  }

  if (streakDays >= 7) {
    return (
      <motion.div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="text-orange-400 text-base"
        >
          🔥
        </motion.span>
        <span className="text-xs font-semibold text-orange-300">
          {streakDays}日連続中！
        </span>
      </motion.div>
    );
  }

  if (streakDays >= 3) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-400/30">
        <span className="text-sm">🔥🔥</span>
        <span className="text-xs text-orange-300">{streakDays}日連続</span>
      </div>
    );
  }

  // 1-2日
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-xs">🔥</span>
    </div>
  );
}
