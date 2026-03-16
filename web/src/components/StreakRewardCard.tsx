'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface WeekDay {
  day: number;
  coins: number;
  reached: boolean;
  isMilestone: boolean;
}

interface NextMilestone {
  day: number;
  multiplier: number;
  label: string;
  daysLeft: number;
}

interface StatusData {
  claimed: boolean;
  claimedAmount: number | null;
  streak: number;
  currentMultiplier: number;
  todayReward: number;
  nextMilestone: NextMilestone | null;
  weekProgress: WeekDay[];
}

export default function StreakRewardCard() {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [claimedCoins, setClaimedCoins] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/daily-bonus/status');
      if (!res.ok) return;
      const json: StatusData = await res.json();
      setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchStatus();
    }
  }, [authStatus, fetchStatus]);

  const handleClaim = async () => {
    if (claiming || data?.claimed) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/daily-bonus', { method: 'POST' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.awarded) {
        setClaimedCoins(json.coins);
        setJustClaimed(true);
        // ステータスを再取得
        await fetchStatus();
        // 3秒後にアニメーションをリセット
        setTimeout(() => setJustClaimed(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setClaiming(false);
    }
  };

  if (authStatus !== 'authenticated') return null;

  if (loading) {
    return (
      <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-400">🔥 ログインボーナス</span>
        </div>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { claimed, streak, todayReward, nextMilestone, weekProgress, currentMultiplier } = data;

  return (
    <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
          <span className="text-base">🔥</span>
          ログインボーナス
        </h3>
        {streak > 0 && (
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
            {streak}日連続
          </span>
        )}
      </div>

      {/* 7日間プログレス */}
      <div className="px-4 py-3">
        <div className="flex justify-between items-end gap-1">
          {weekProgress.map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-1.5 flex-1">
              {/* コイン数 */}
              <span className={`text-[10px] font-bold ${
                day.reached ? 'text-amber-400' : 'text-gray-600'
              }`}>
                {day.coins}
              </span>
              {/* ドット */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                day.reached
                  ? day.isMilestone
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-purple-500/80 text-white'
                  : 'bg-gray-800 text-gray-600 border border-gray-700/50'
              }`}>
                {day.reached ? (day.isMilestone ? '★' : '✓') : day.day}
              </div>
              {/* 日数ラベル */}
              <span className={`text-[10px] ${
                day.reached ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Day {day.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 受け取りエリア */}
      <div className="px-4 pb-4">
        {justClaimed ? (
          /* 受け取り直後のフィードバック */
          <div className="flex items-center justify-center gap-2 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
            <span className="text-xl">🪙</span>
            <span className="text-amber-300 font-black text-lg">+{claimedCoins}</span>
            <span className="text-amber-400/80 text-sm">GET!</span>
          </div>
        ) : claimed ? (
          /* 受け取り済み */
          <div className="flex items-center justify-between py-3 px-4 bg-gray-800/50 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-gray-400 text-sm">今日のボーナス受取済み</span>
            </div>
            {nextMilestone && (
              <span className="text-gray-500 text-xs">
                あと{nextMilestone.daysLeft}日で×{nextMilestone.multiplier}
              </span>
            )}
          </div>
        ) : (
          /* 未受け取り → 受け取りボタン */
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <span className="text-xl">🪙</span>
            <span>
              {claiming ? '受け取り中...' : `今日のボーナスを受け取る (+${todayReward})`}
            </span>
            {currentMultiplier > 1 && (
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-md">
                ×{currentMultiplier}
              </span>
            )}
          </button>
        )}
      </div>

      {/* フッター */}
      {nextMilestone && !claimed && streak > 0 && (
        <div className="px-4 pb-3">
          <p className="text-gray-600 text-[11px] text-center">
            {nextMilestone.label}達成まであと{nextMilestone.daysLeft}日 → ×{nextMilestone.multiplier}ボーナス
          </p>
        </div>
      )}
    </section>
  );
}
