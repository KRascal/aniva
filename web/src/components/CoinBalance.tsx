'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCoinPurchase } from '@/components/coins/CoinPurchaseContext';
import { CoinIcon } from '@/components/ui/CoinIcon';

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
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-400/60">
        <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
      </svg>
      <CoinIcon size={14} />
      <span className="text-white text-sm font-semibold ml-0.5">{balance.toLocaleString()}</span>
    </button>
  );
}
