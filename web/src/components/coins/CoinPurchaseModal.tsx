'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  priceWebJpy: number;
}

interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
}

const TIER_STYLES: Record<number, { gradient: string; glow: string; label?: string }> = {
  1: { gradient: 'from-slate-500 to-slate-600', glow: 'rgba(100,116,139,0.2)' },
  2: { gradient: 'from-blue-500 to-blue-600', glow: 'rgba(59,130,246,0.2)' },
  3: { gradient: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.25)', label: 'POPULAR' },
  4: { gradient: 'from-amber-500 to-orange-600', glow: 'rgba(245,158,11,0.3)' },
  5: { gradient: 'from-rose-500 to-pink-600', glow: 'rgba(244,63,94,0.3)', label: 'BEST VALUE' },
  6: { gradient: 'from-yellow-400 to-amber-500', glow: 'rgba(250,204,21,0.35)', label: 'LEGEND' },
};

export function CoinPurchaseModal({ isOpen, onClose, currentBalance }: CoinPurchaseModalProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/coins/packages')
      .then(r => r.json())
      .then(data => setPackages(data.packages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = (pkg: CoinPackage) => {
    router.push(`/coins/purchase?packageId=${pkg.id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl pb-safe"
        style={{
          background: 'linear-gradient(180deg, rgba(15,10,30,0.98), rgba(5,3,15,0.99))',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-lg font-black tracking-tight">COIN SHOP</h2>
              {currentBalance !== undefined && (
                <p className="text-white/40 text-xs mt-0.5">
                  保有: <span className="text-yellow-400 font-bold">{currentBalance.toLocaleString()}</span> coin
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/50">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Package grid */}
        <div className="px-5 pb-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pkg, i) => {
                const tier = TIER_STYLES[i + 1] ?? TIER_STYLES[1];
                const perCoin = Math.round(pkg.priceWebJpy / pkg.coinAmount * 100) / 100;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => handlePurchase(pkg)}
                    className="relative rounded-2xl p-3.5 text-left transition-all active:scale-[0.97] overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: `0 4px 20px ${tier.glow}`,
                    }}
                  >
                    {/* Gradient accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tier.gradient}`} />

                    {tier.label && (
                      <span
                        className="absolute top-2.5 right-2 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.8), rgba(245,158,11,0.8))' }}
                      >
                        {tier.label}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-yellow-400">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6v12M8 10h8M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="text-yellow-300 text-lg font-black">{pkg.coinAmount.toLocaleString()}</span>
                    </div>

                    <p className="text-white/50 text-[10px] font-medium mb-2">{pkg.name}</p>

                    <div className="flex items-baseline gap-1">
                      <span className="text-white font-black text-base">¥{pkg.priceWebJpy.toLocaleString()}</span>
                      <span className="text-white/30 text-[10px]">({perCoin.toFixed(1)}円/coin)</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
