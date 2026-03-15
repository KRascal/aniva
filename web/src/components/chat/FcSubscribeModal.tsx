'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface FcSubscribeModalProps {
  characterName: string;
  characterAvatar?: string;
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  fcMonthlyCoins: number;
  onClose: () => void;
  onSubscribe: () => void;
}

export function FcSubscribeModal({
  characterName,
  characterAvatar,
  fcMonthlyPriceJpy,
  fcIncludedCallMin,
  fcMonthlyCoins,
  onClose,
  onSubscribe,
}: FcSubscribeModalProps) {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      onSubscribe();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal — max-h で高さ制限 + overflow-y-auto でスクロール可 */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-900 to-black border border-purple-500/30 rounded-t-3xl overflow-y-auto max-h-[92dvh] animate-[slideUp_0.3s_ease-out]">
        {/* スワイプ閉じバー + 戻るボタン */}
        <div className="sticky top-0 z-10 bg-gray-900/95 pt-3 pb-2 px-4 flex items-center justify-between border-b border-white/5">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors active:scale-95 py-1 px-2 -ml-2 rounded-xl"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">{tc('back')}</span>
          </button>
          {/* スワイプインジケーター */}
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header with gradient */}
        <div className="relative h-28 bg-gradient-to-br from-purple-600/40 via-pink-600/30 to-purple-800/40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(168,85,247,0.3),transparent_70%)]" />
          {characterAvatar && (
            <img
              src={characterAvatar}
              alt={characterName}
              className="w-20 h-20 rounded-full border-2 border-purple-400/50 object-cover shadow-lg shadow-purple-500/20"
            />
          )}
          {!characterAvatar && (
            <div className="w-20 h-20 rounded-full border-2 border-purple-400/50 bg-purple-900/50 flex items-center justify-center text-2xl">
              👑
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          <h2 className="text-center text-lg font-bold text-white mb-1">
            {characterName}{t('fcModalTitleOf')}<span className="text-purple-400">{t('fcModalFcMember')}</span>{t('fcModalTitleBecome')}
          </h2>
          <p className="text-center text-gray-500 text-xs mb-5">
            {t('fcModalSubtitle')}
          </p>

          {/* キャッチコピー */}
          <div className="text-center mb-4 bg-gradient-to-r from-purple-900/40 to-pink-900/30 border border-purple-500/20 rounded-2xl px-4 py-3">
            <p className="text-white/90 text-sm leading-relaxed">
              {t('fcModalCatchPre')}{characterName}{t('fcModalCatchMid')}<span className="text-purple-300 font-bold">{t('fcModalCatchHighlight')}</span>{t('fcModalCatchPost')}
              <br />{t('fcModalCatchLine2')}
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitChatTitle')}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitChatDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">📞</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitCallTitle', { min: fcIncludedCallMin })}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitCallDesc', { name: characterName })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">📰</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitTimelineTitle')}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitTimelineDesc', { name: characterName })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">📖</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitStoryTitle')}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitStoryDesc', { name: characterName })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">💌</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitLetterTitle')}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitLetterDesc', { name: characterName })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">🎰</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitGachaTitle')}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitGachaDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">📦</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitDlcTitle')}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitDlcDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">🪙</span>
              <div>
                <p className="text-white text-sm font-medium">{t('fcModalBenefitCoinsTitle', { coins: fcMonthlyCoins })}</p>
                <p className="text-gray-500 text-xs">{t('fcModalBenefitCoinsDesc')}</p>
              </div>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="text-center mb-4">
            <span className="text-gray-500 text-xs">{t('fcModalMonthlyLabel')}</span>
            <p className="text-3xl font-bold text-white">
              ¥{fcMonthlyPriceJpy.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">{t('fcModalPerMonth')}</span>
            </p>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
          >
            {loading ? t('fcModalProcessing') : t('fcModalJoinButton')}
          </button>

          <p className="text-center text-gray-600 text-[10px] mt-3 pb-safe">
            {t('fcModalCancelNote')}
          </p>
          {/* iOS safe area spacing */}
          <div className="h-6" />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
