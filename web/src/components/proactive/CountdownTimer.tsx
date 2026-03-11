'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  expiresAt: string;
  className?: string;
}

export function CountdownTimer({ expiresAt, className = '' }: CountdownTimerProps) {
  const [display, setDisplay] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Assume total duration is ~8 hours from creation
    const expiresTime = new Date(expiresAt).getTime();
    const totalDuration = 8 * 60 * 60 * 1000; // 8h assumed

    const update = () => {
      const diff = expiresTime - Date.now();
      if (diff <= 0) {
        setDisplay('00:00:00');
        setIsUrgent(false);
        setProgress(0);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setDisplay(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      setIsUrgent(diff < 60 * 60 * 1000);
      setProgress(Math.min(100, (diff / totalDuration) * 100));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
        isUrgent
          ? 'bg-red-950/60 border-red-500/40'
          : 'bg-white/[0.04] border-white/10'
      } ${className}`}
    >
      <span className={`text-[10px] ${isUrgent ? 'text-red-400' : 'text-white/40'}`}>⏱</span>
      <span
        className={`text-[11px] font-mono tabular-nums tracking-wider ${
          isUrgent ? 'text-red-400 animate-pulse' : 'text-white/50'
        }`}
      >
        {display}
      </span>
    </div>
  );
}
