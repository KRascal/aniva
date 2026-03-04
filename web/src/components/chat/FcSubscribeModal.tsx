'use client';

import { useState } from 'react';

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black border border-purple-500/30 rounded-t-3xl sm:rounded-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Header with gradient */}
        <div className="relative h-32 bg-gradient-to-br from-purple-600/40 via-pink-600/30 to-purple-800/40 flex items-center justify-center overflow-hidden">
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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          <h2 className="text-center text-lg font-bold text-white mb-1">
            {characterName}の<span className="text-purple-400">FC会員</span>になる
          </h2>
          <p className="text-center text-gray-500 text-xs mb-5">
            ファンクラブに加入して特別な体験を
          </p>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-white text-sm font-medium">チャット無制限</p>
                <p className="text-gray-500 text-xs">コイン消費なしで何度でも会話</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">📞</span>
              <div>
                <p className="text-white text-sm font-medium">音声通話 月{fcIncludedCallMin}分込み</p>
                <p className="text-gray-500 text-xs">直接声を聞いて会話できる</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">🪙</span>
              <div>
                <p className="text-white text-sm font-medium">毎月{fcMonthlyCoins}コイン付与</p>
                <p className="text-gray-500 text-xs">ギフトや追加通話に使える</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-white text-sm font-medium">FC限定コンテンツ</p>
                <p className="text-gray-500 text-xs">特別な投稿やシークレットを解放</p>
              </div>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="text-center mb-4">
            <span className="text-gray-500 text-xs">月額</span>
            <p className="text-3xl font-bold text-white">
              ¥{fcMonthlyPriceJpy.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">/月</span>
            </p>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
          >
            {loading ? '処理中...' : '👑 FC会員になる'}
          </button>

          <p className="text-center text-gray-600 text-[10px] mt-3">
            いつでもキャンセル可能 • Stripeで安全に決済
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
