'use client';

import { useState, useEffect } from 'react';

interface ModalItem {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  priceCoins: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  isPurchased?: boolean;
}

interface PurchaseModalProps {
  item: ModalItem | null;
  userBalance: number;
  onClose: () => void;
}

export function PurchaseModal({ item, userBalance, onClose }: PurchaseModalProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState(userBalance);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (item) {
      setStatus(item.isPurchased ? 'success' : 'idle');
      setDownloadUrl(item.isPurchased ? item.fileUrl ?? null : null);
      setNewBalance(userBalance);
      setErrorMsg('');
    }
  }, [item, userBalance]);

  if (!item) return null;

  const canAfford = userBalance >= item.priceCoins;

  const handlePurchase = async () => {
    if (!canAfford || status === 'processing') return;
    setStatus('processing');
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setDownloadUrl(data.downloadUrl ?? null);
        setNewBalance(data.coinBalanceAfter ?? userBalance - item.priceCoins);
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? '購入に失敗しました');
      }
    } catch {
      setStatus('error');
      setErrorMsg('通信エラーが発生しました');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-auto bg-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Image */}
        <div className="relative aspect-[16/10] bg-gray-900 mx-4 mt-3 rounded-2xl overflow-hidden">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </div>
          )}
          {status === 'success' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-green-400 font-bold text-sm">購入完了</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-white font-bold text-lg">{item.name}</h3>
          {item.description && (
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Price & Balance */}
        <div className="px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">価格</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#000" fontWeight="bold">C</text>
              </svg>
              <span className="text-amber-300 text-lg font-bold">{item.priceCoins.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">残高</p>
            <p className={`text-lg font-bold mt-0.5 ${canAfford ? 'text-white' : 'text-red-400'}`}>
              {(status === 'success' ? newBalance : userBalance).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 pt-2 space-y-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          {status === 'error' && (
            <p className="text-red-400 text-xs text-center mb-2">{errorMsg}</p>
          )}

          {status === 'success' ? (
            <>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center text-sm font-bold rounded-2xl hover:from-green-500 hover:to-emerald-500 transition-all active:scale-[0.98]"
                >
                  ダウンロード
                </a>
              )}
              <button
                onClick={onClose}
                className="block w-full py-3 bg-white/5 text-white/60 text-center text-sm font-medium rounded-2xl hover:bg-white/10 transition-all"
              >
                閉じる
              </button>
            </>
          ) : !canAfford ? (
            <>
              <a
                href="/pricing"
                className="block w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-center text-sm font-bold rounded-2xl hover:from-amber-500 hover:to-orange-500 transition-all active:scale-[0.98]"
              >
                コインを購入する
              </a>
              <button
                onClick={onClose}
                className="block w-full py-3 bg-white/5 text-white/60 text-center text-sm font-medium rounded-2xl hover:bg-white/10 transition-all"
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePurchase}
                disabled={status === 'processing'}
                className="block w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-center text-sm font-bold rounded-2xl hover:from-amber-500 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {status === 'processing' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    処理中...
                  </span>
                ) : (
                  `購入する（${item.priceCoins.toLocaleString()}コイン）`
                )}
              </button>
              <button
                onClick={onClose}
                className="block w-full py-3 bg-white/5 text-white/60 text-center text-sm font-medium rounded-2xl hover:bg-white/10 transition-all"
              >
                キャンセル
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
