'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCoinPurchase } from '@/components/coins/CoinPurchaseContext';

export function CoinBalanceDisplay() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const { openCoinPurchase } = useCoinPurchase();

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/coins/balance')
      .then(r => r.json())
      .then(d => setBalance(d.balance))
      .catch(() => {});
  }, [session]);

  if (balance === null) return null;

  return (
    <button
      onClick={() => openCoinPurchase(balance)}
      className="flex items-center gap-1 bg-gray-800/80 rounded-full pl-2 pr-3 py-1.5 border border-gray-700/50 transition-colors hover:bg-gray-700/80 active:scale-95"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-yellow-400/70 mr-0.5">
        <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
      </svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
        <circle cx="12" cy="12" r="10"/><path d="M12 7v10M9 10h6M9 14h6" strokeLinecap="round"/>
      </svg>
      <span className="text-white text-sm font-semibold ml-0.5">{balance.toLocaleString()}</span>
    </button>
  );
}
