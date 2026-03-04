'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { playSound } from '@/lib/sound-effects';

interface BonusData {
  awarded: boolean;
  amount: number;
  streakDays: number;
  isFirstLogin: boolean; // 初回登録ボーナス
  welcomeAmount?: number; // 初回登録ボーナス額
  totalBalance: number;
}

export function LoginBonusPopup() {
  const { data: session, status } = useSession();
  const [bonusData, setBonusData] = useState<BonusData | null>(null);
  const [show, setShow] = useState(false);
  const [animPhase, setAnimPhase] = useState<'enter' | 'coins' | 'streak' | 'exit'>('enter');

  const checkBonus = useCallback(async () => {
    // セッション中に1回だけ
    const key = `aniva_bonus_checked_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    try {
      const res = await fetch('/api/daily-bonus', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.awarded || data.isFirstLogin) {
        setBonusData(data);
        setShow(true);
        playSound(data.isFirstLogin ? 'level_up' : 'login_bonus');
        // アニメーションシーケンス
        setTimeout(() => setAnimPhase('coins'), 400);
        setTimeout(() => setAnimPhase('streak'), 1200);
        // 5秒後に自動で閉じる
        setTimeout(() => {
          setAnimPhase('exit');
          setTimeout(() => setShow(false), 400);
        }, 5000);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // 少し遅延してから表示（ページロード直後を避ける）
      const timer = setTimeout(checkBonus, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, session, checkBonus]);

  if (!show || !bonusData) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-400
        ${animPhase === 'exit' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      onClick={() => {
        setAnimPhase('exit');
        setTimeout(() => setShow(false), 400);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={`relative w-[85vw] max-w-sm rounded-2xl overflow-hidden shadow-2xl
          ${animPhase === 'enter' ? 'animate-bounce-in' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

        {/* Body */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-6 py-8 text-center">
          {/* First Login Welcome */}
          {bonusData.isFirstLogin && (
            <div className="mb-4">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-bold text-white mb-1">ようこそ ANIVA へ！</h2>
              <p className="text-amber-300 text-sm">
                初回登録ボーナス <span className="text-2xl font-bold">{bonusData.welcomeAmount ?? 500}</span> コイン🪙
              </p>
            </div>
          )}

          {/* Daily Login Bonus */}
          <div className={`transition-all duration-500 ${animPhase === 'enter' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {!bonusData.isFirstLogin && (
              <div className="text-3xl mb-2">🪙</div>
            )}
            <h2 className="text-lg font-bold text-white mb-1">
              {bonusData.isFirstLogin ? '' : 'ログインボーナス！'}
            </h2>

            {/* Coin amount with animation */}
            <div className={`my-4 transition-all duration-500 ${
              animPhase === 'coins' || animPhase === 'streak' ? 'scale-110' : 'scale-100'
            }`}>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 rounded-xl px-5 py-3">
                <span className="text-amber-400 text-2xl">🪙</span>
                <span className="text-3xl font-black text-amber-300">+{bonusData.amount}</span>
              </div>
            </div>

            {/* Streak display */}
            <div className={`transition-all duration-500 ${
              animPhase === 'streak' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              {bonusData.streakDays > 1 && (
                <div className="flex items-center justify-center gap-1 text-sm">
                  <span className="text-orange-400">🔥</span>
                  <span className="text-orange-300 font-bold">{bonusData.streakDays}日連続ログイン！</span>
                </div>
              )}

              {/* Streak milestones */}
              <div className="flex justify-center gap-1 mt-3">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div
                    key={day}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${day <= bonusData.streakDays
                        ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                        : 'bg-gray-800 border-gray-700 text-gray-500'
                      }
                      ${day === 7 ? 'ring-2 ring-purple-400/50' : ''}`}
                  >
                    {day === 7 ? '👑' : day}
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">7日連続で3倍ボーナス！</p>
            </div>

            {/* Total balance */}
            <div className="mt-4 text-gray-400 text-xs">
              所持コイン: <span className="text-amber-300 font-bold">{bonusData.totalBalance}</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setAnimPhase('exit');
              setTimeout(() => setShow(false), 400);
            }}
            className="mt-5 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl px-4 py-2.5 font-medium text-sm hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            OK
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
