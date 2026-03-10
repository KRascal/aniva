'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CoinPurchaseModal } from './CoinPurchaseModal';

interface CoinPurchaseContextValue {
  openCoinPurchase: (balance?: number) => void;
}

const CoinPurchaseContext = createContext<CoinPurchaseContextValue>({
  openCoinPurchase: () => {},
});

export function useCoinPurchase() {
  return useContext(CoinPurchaseContext);
}

export function CoinPurchaseProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | undefined>();

  const openCoinPurchase = useCallback((b?: number) => {
    setBalance(b);
    setOpen(true);
  }, []);

  return (
    <CoinPurchaseContext.Provider value={{ openCoinPurchase }}>
      {children}
      <CoinPurchaseModal
        isOpen={open}
        onClose={() => setOpen(false)}
        currentBalance={balance}
      />
    </CoinPurchaseContext.Provider>
  );
}
