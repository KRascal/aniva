'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { playSound } from '@/lib/sound-effects';

interface Mission {
  id: string;
  title: string;
  desc: string;
  coins: number;
  icon: string;
  completed: boolean;
}

interface MissionsData {
  missions: Mission[];
  date: string;
  completedCount: number;
  remainingCoins: number;
}

export default function DailyMissionsCard() {
  const [data, setData] = useState<MissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions');
      if (!res.ok) return;
      const json = await res.json() as MissionsData;
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMissions();
  }, [fetchMissions]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const completeMission = async (missionId: string) => {
    if (claiming) return;
    setClaiming(missionId);
    try {
      const res = await fetch('/api/missions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });
      const json = await res.json() as { ok?: boolean; alreadyClaimed?: boolean; message?: string; coins?: number };
      if (json.alreadyClaimed) {
        showToast('今日はもう完了済みだよ！');
      } else if (json.ok === false) {
        showToast(json.message ?? 'まだ条件を満たしていないよ！');
      } else if (json.coins) {
        playSound('coin_earn');
        showToast(`+${json.coins}コイン獲得！🎉`);
        // 完了状態を楽観的更新
        setData(prev => prev ? {
          ...prev,
          completedCount: prev.completedCount + 1,
          remainingCoins: prev.remainingCoins - (prev.missions.find(m => m.id === missionId)?.coins ?? 0),
          missions: prev.missions.map(m => m.id === missionId ? { ...m, completed: true } : m),
        } : prev);
      }
    } catch {
      showToast('エラーが発生しました');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-700/30 p-4 animate-pulse">
        <div className="h-4 bg-purple-800/30 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-12 bg-purple-800/20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allDone = data.completedCount >= data.missions.length;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-600/40 p-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1">
            🎯 デイリーミッション
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {allDone
              ? '全ミッション完了！また明日ね ✨'
              : `残り ${data.remainingCoins}コイン獲得チャンス`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-purple-300 font-bold">
            {data.completedCount}/{data.missions.length}
          </span>
          {/* Progress dots */}
          <div className="flex gap-1 justify-end mt-1">
            {data.missions.map(m => (
              <div
                key={m.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  m.completed ? 'bg-green-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mission list */}
      <div className="space-y-2">
        {data.missions.map(mission => (
          <div
            key={mission.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${
              mission.completed
                ? 'bg-green-900/20 border border-green-700/30'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <span className="text-lg w-6 text-center shrink-0">{mission.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${mission.completed ? 'text-green-300' : 'text-white'}`}>
                {mission.title}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{mission.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-yellow-400 font-bold">+{mission.coins}</span>
              {mission.completed ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <button
                  onClick={() => void completeMission(mission.id)}
                  disabled={claiming === mission.id}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                >
                  {claiming === mission.id ? (
                    <Circle className="w-3 h-3 animate-spin" />
                  ) : (
                    '達成'
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* All done glow */}
      {allDone && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: 'inset 0 0 30px rgba(74, 222, 128, 0.1)' }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-purple-500/50 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-fade-in z-10 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
