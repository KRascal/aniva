'use client';

import { useEffect, useState } from 'react';

interface FadeToBlackProps {
  trigger: boolean;
  duration?: number; // ms, default 2000
  onComplete?: () => void;
}

export default function FadeToBlack({
  trigger,
  duration = 2000,
  onComplete,
}: FadeToBlackProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!trigger) {
      setOpacity(0);
      return;
    }

    setOpacity(1);
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [trigger, duration, onComplete]);

  if (!trigger && opacity === 0) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-50 pointer-events-none"
      style={{
        opacity,
        transition: trigger ? `opacity ${duration}ms ease-in-out` : 'none',
      }}
    />
  );
}
