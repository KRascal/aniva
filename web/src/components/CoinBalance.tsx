'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function CoinBalanceDisplay() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/coins/balance')
      .then(r => r.json())
      .then(d => setBalance(d.balance))
      .catch(() => {});
  }, [session]);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-1.5 bg-gray-800/80 rounded-full px-3 py-1.5 border border-gray-700/50">
      <span className="text-yellow-400 text-sm">🪙</span>
      <span className="text-white text-sm font-semibold">{balance.toLocaleString()}</span>
    </div>
  );
}
