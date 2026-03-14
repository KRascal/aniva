'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export interface PaywallModalProps {
  type: 'CHAT_LIMIT' | 'CALL_LIMIT';
  characterName: string;
  characterId: string;
  freeMessageLimit?: number;
  freeCallMinutes?: number;
  fcMonthlyPriceJpy?: number;
  fcIncludedCallMin?: number;
  callCoinPerMin?: number;
  fcOverageCallCoinPerMin?: number;
  coinBalance?: number;
  onClose: () => void;
  onJoinFC: () => void;
  onBuyCoins: () => void;
  onSpendCoins?: () => void;
}

export function PaywallModal({
  type,
  characterName,
  characterId,
  freeMessageLimit = 10,
  freeCallMinutes = 5,
  fcMonthlyPriceJpy = 3480,
  fcIncludedCallMin = 30,
  callCoinPerMin = 200,
  fcOverageCallCoinPerMin = 100,
  coinBalance = 0,
  onClose,
  onJoinFC,
  onBuyCoins,
  onSpendCoins,
}: PaywallModalProps) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const t = useTranslations('paywall');
  const tc = useTranslations('common');

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleJoinFC = () => {
    setVisible(false);
    setTimeout(onJoinFC, 300);
  };

  const handleBuyCoins = () => {
    setVisible(false);
    setTimeout(() => {
      onBuyCoins();
      router.push('/coins');
    }, 300);
  };

  const handleSpendCoins = () => {
    if (onSpendCoins) {
      setVisible(false);
      setTimeout(onSpendCoins, 300);
    }
  };

  const isChatLimit = type === 'CHAT_LIMIT';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.70)' }}
      onClick={handleClose}
    >
      {/* Modal card */}
      <div
        className={`relative bg-gray-900 rounded-2xl border border-gray-800 p-6 max-w-sm w-full shadow-2xl transition-all duration-300 ${
          visible ? 'scale-100' : 'scale-90'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-300 text-xl leading-none transition-colors"
          aria-label={tc('close')}
        >
          ×
        </button>

        {/* Header — キャラの声で語りかける */}
        <div className="mb-5 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <span className="text-xl">💭</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            {isChatLimit ? t('chatLimitMessage') : t('callLimitMessage')}
          </h2>
          <p className="text-[var(--color-muted)] text-sm">
            {isChatLimit
              ? t('chatLimitSub', { name: characterName })
              : t('callLimitSub', { name: characterName })}
          </p>
        </div>

        {/* ── おすすめ: FC加入カード ── */}
        <div className="mb-3 rounded-2xl p-[1.5px] bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="bg-gray-900 rounded-[14px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 rounded-full">
                {t('recommended')}
              </span>
              <span className="text-white font-semibold text-sm">{t('joinFc')}</span>
            </div>

            <p className="text-gray-300 text-xs mb-3 leading-relaxed">
              {t('fcPriceDesc', { price: fcMonthlyPriceJpy.toLocaleString() })}
              <span className="text-purple-300 font-semibold">{t('unlimitedChat')}</span>
              {' + '}
              <span className="text-purple-300 font-semibold">{t('callMinIncluded', { min: fcIncludedCallMin })}</span>
              {t('included')}
            </p>

            <button
              onClick={handleJoinFC}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95"
            >
              {t('joinFcButton')}
            </button>
          </div>
        </div>

        {/* ── コインで続ける ── */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <p className="text-white font-semibold text-sm mb-1">{t('continueWithCoins')}</p>
          <p className="text-gray-400 text-xs mb-3">
            {isChatLimit
              ? t('chatCoinRate', { balance: coinBalance })
              : t('callCoinRate', { rate: callCoinPerMin, balance: coinBalance })}
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleBuyCoins}
              className={`py-2.5 rounded-xl border border-purple-600 text-purple-400 font-bold text-sm hover:bg-purple-600/10 transition-all active:scale-95 ${
                coinBalance > 0 ? 'w-1/2' : 'w-full'
              }`}
            >
              {t('buyCoins')}
            </button>

            {coinBalance > 0 && onSpendCoins && (
              <button
                onClick={handleSpendCoins}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95"
              >
                {isChatLimit ? t('sendWithCoins') : t('callWithCoins')}
              </button>
            )}
          </div>
        </div>

        {/* FC超過料金の補足（通話上限時のみ） */}
        {!isChatLimit && (
          <p className="mt-3 text-center text-gray-500 text-xs">
            FCメンバーの超過通話: {fcOverageCallCoinPerMin}コイン/分
          </p>
        )}
      </div>
    </div>
  );
}
