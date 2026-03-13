'use client';

import { useEffect, useState } from 'react';

interface BonusData {
  alreadyClaimed: boolean;
  coins?: number;
  streak?: number;
  multiplier?: number;
  totalBalance?: number;
  message: string;
  isStreakMilestone?: boolean;
}

export function DailyBonus() {
  const [bonus, setBonus] = useState<BonusData | null>(null);
  const [show, setShow] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // ページロード時にボーナスチェック
    const checkBonus = async () => {
      try {
        const res = await fetch('/api/daily-bonus', { method: 'POST' });
        if (!res.ok) return;
        const data: BonusData = await res.json();
        if (!data.alreadyClaimed) {
          setBonus(data);
          setShow(true);
          setAnimating(true);
          // 自動で閉じる（5秒後）
          setTimeout(() => setShow(false), 5000);
        }
      } catch {
        // サイレントフェイル
      }
    };
    // 少し遅延させてUXを阻害しない
    const timer = setTimeout(checkBonus, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!bonus || !show) return null;

  return (
    <>
      <style>{`
        @keyframes bonusSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bonusSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        @keyframes coinBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.3) rotate(-10deg); }
          50% { transform: scale(1.1) rotate(5deg); }
          75% { transform: scale(1.2) rotate(-3deg); }
        }
        @keyframes streakGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); }
          50% { box-shadow: 0 0 20px 8px rgba(234,179,8,0.3); }
        }
        .bonus-enter { animation: bonusSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .bonus-exit { animation: bonusSlideOut 0.3s ease-in forwards; }
        .coin-bounce { animation: coinBounce 0.6s ease-in-out; }
        .streak-glow { animation: streakGlow 1.5s ease-in-out infinite; }
      `}</style>
      {/* バックドロップ */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
        onClick={() => setShow(false)}
      >
        <div
          className={`relative max-w-sm w-full mx-4 rounded-3xl overflow-hidden border ${
            bonus.isStreakMilestone
              ? 'border-yellow-500/50 streak-glow'
              : 'border-purple-500/30'
          } ${animating ? 'bonus-enter' : 'bonus-exit'}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: bonus.isStreakMilestone
              ? 'linear-gradient(135deg, #1a1a2e 0%, #3d1f00 50%, #1a1a2e 100%)'
              : 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #1a1a2e 100%)',
          }}
        >
          {/* コンテンツ */}
          <div className="p-6 text-center">
            {/* コインアイコン */}
            <div className="coin-bounce text-5xl mb-3">
              {bonus.isStreakMilestone ? '👑' : '🪙'}
            </div>

            {/* タイトル */}
            <h3 className="text-white font-black text-lg mb-1">
              {bonus.isStreakMilestone ? '🔥 ストリークボーナス！' : 'ログインボーナス！'}
            </h3>

            {/* キャラメッセージ */}
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              {bonus.message}
            </p>

            {/* コイン獲得表示 */}
            <div className="bg-white/10 rounded-2xl px-6 py-4 mb-4 border border-white/10">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl">🪙</span>
                <span className="text-yellow-300 font-black text-3xl">+{bonus.coins}</span>
              </div>
              {bonus.multiplier && bonus.multiplier > 1 && (
                <p className="text-yellow-400/80 text-xs mt-1 font-bold">
                  ×{bonus.multiplier} ストリークボーナス!
                </p>
              )}
            </div>

            {/* ストリーク表示 */}
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className="text-center">
                <div className="text-orange-400 font-black text-xl">{bonus.streak}</div>
                <div className="text-gray-500 text-[10px]">連続日数</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-purple-400 font-black text-xl">{bonus.totalBalance?.toLocaleString()}</div>
                <div className="text-gray-500 text-[10px]">総コイン</div>
              </div>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={() => setShow(false)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all active:scale-[0.98]"
            >
              受け取る ✨
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
