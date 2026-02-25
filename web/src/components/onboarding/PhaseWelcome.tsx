'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CharacterData } from '@/hooks/useOnboarding';

interface PhaseWelcomeProps {
  character: CharacterData | null;
  onComplete: () => void;
}

export default function PhaseWelcome({ character, onComplete }: PhaseWelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 5300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center cursor-pointer"
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {character?.avatarUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 0.75, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 3, ease: 'easeInOut' }}
          className="relative"
        >
          {/* キャラシルエット */}
          <img
            src={character.avatarUrl}
            alt=""
            className="w-56 h-56 md:w-72 md:h-72 object-contain"
            style={{
              filter: 'brightness(0)',
              opacity: 1,
            }}
          />
          {/* アンビエントグロー */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 2 }}
          />
        </motion.div>
      ) : (
        // ANIVAロゴ（汎用シルエット）
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 3, ease: 'easeInOut' }}
          className="text-center"
        >
          <motion.div
            className="text-6xl md:text-8xl font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(236,72,153,0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ANIVA
          </motion.div>
          <motion.div
            className="mt-4 w-16 h-0.5 mx-auto"
            style={{
              background: 'linear-gradient(90deg, rgba(139,92,246,0.4), rgba(236,72,153,0.4))',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.5, duration: 1.5 }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
