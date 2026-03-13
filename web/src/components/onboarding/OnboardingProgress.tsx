'use client';

import { motion } from 'framer-motion';
import type { OnboardingPhase } from '@/hooks/useOnboarding';

interface OnboardingProgressProps {
  currentPhase: OnboardingPhase;
  isDeepLink: boolean;
}

const GENERIC_PHASES: OnboardingPhase[] = ['welcome', 'character_select', 'nickname', 'approval', 'first_chat', 'hook'];
const DEEPLINK_PHASES: OnboardingPhase[] = ['welcome', 'nickname', 'approval', 'first_chat', 'hook'];

export default function OnboardingProgress({ currentPhase, isDeepLink }: OnboardingProgressProps) {
  const phases = isDeepLink ? DEEPLINK_PHASES : GENERIC_PHASES;
  const currentIndex = phases.indexOf(currentPhase);

  // Hide on welcome phase
  if (currentPhase === 'welcome') return null;

  return (
    <motion.div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {phases.slice(1).map((phase, idx) => {
        const adjustedIdx = idx + 1; // skip welcome
        const isCompleted = adjustedIdx < currentIndex;
        const isCurrent = adjustedIdx === currentIndex;

        return (
          <motion.div
            key={phase}
            className="rounded-full transition-all duration-500"
            animate={{
              width: isCurrent ? 20 : 6,
              height: 6,
              background: isCompleted || isCurrent
                ? 'linear-gradient(90deg, #7c3aed, #db2777)'
                : 'rgba(255,255,255,0.2)',
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        );
      })}
    </motion.div>
  );
}
