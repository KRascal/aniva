'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  expiresAt: string;
  className?: string;
}

export function CountdownTimer({ expiresAt, className = '' }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('消えた…');
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(diff < 60 * 60 * 1000); // 1時間未満で緊迫感

      if (hours > 0) {
        setRemaining(`${hours}時間${minutes}分後に消える`);
      } else if (minutes > 0) {
        setRemaining(`${minutes}分${seconds}秒後に消える`);
      } else {
        setRemaining(`${seconds}秒後に消える`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span
      className={`text-xs font-mono ${isUrgent ? 'text-red-400 animate-pulse' : 'text-gray-400'} ${className}`}
    >
      ⏱ {remaining}
    </span>
  );
}
