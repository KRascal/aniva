'use client';

import { useEffect, useState } from 'react';

interface ActivityData {
  days: Record<string, number>;
  streak: number;
  totalDays: number;
  topCharacter: string | null;
}

// チャット回数 → セルの背景色
function getCellColor(count: number): string {
  if (count === 0) return 'bg-gray-800';
  if (count <= 2) return 'bg-purple-900';
  if (count <= 5) return 'bg-purple-700';
  if (count <= 10) return 'bg-purple-500';
  return 'bg-purple-400';
}

// 日付文字列 (YYYY-MM-DD) を生成するユーティリティ
function toTokyoDateStr(date: Date): string {
  // Asia/Tokyo = UTC+9
  const tokyoMs = date.getTime() + (9 * 60 - date.getTimezoneOffset()) * 60000;
  const tokyoDate = new Date(tokyoMs);
  return tokyoDate.toISOString().slice(0, 10);
}

// 直近30日の日付配列を生成（今日を含む）
function getLast30Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toTokyoDateStr(d));
  }
  return dates;
}

// 曜日ヘッダー
const DAY_HEADERS = ['日', '月', '火', '水', '木', '金', '土'];

export default function BondCalendar() {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/activity')
      .then((r) => r.json())
      .then((data: ActivityData & { error?: string }) => {
        if (!data.error) setActivity(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const todayStr = toTokyoDateStr(new Date());
  const last30Days = getLast30Days();

  // グリッド構築: 先頭の曜日に合わせて空セルを追加
  const firstDate = new Date(last30Days[0]);
  const firstDow = firstDate.getDay(); // 0=日, 1=月, ..., 6=土
  // 先頭に空セルを追加してグリッドを整列
  const gridCells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...last30Days,
  ];

  // 現在の月 (今日の月) を表示
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // 月次サマリー: 今月のアクティブ日数と最長ストリーク
  const thisMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const thisMonthDays = activity
    ? Object.entries(activity.days)
        .filter(([d]) => d.startsWith(thisMonthPrefix))
        .filter(([, count]) => count > 0).length
    : 0;

  if (isLoading) {
    return (
      <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-400">📅 絆カレンダー</span>
        </div>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </div>
      </section>
    );
  }

  const streak = activity?.streak ?? 0;
  const totalDays = activity?.totalDays ?? 0;
  const topCharacter = activity?.topCharacter ?? null;
  const days = activity?.days ?? {};

  return (
    <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
      {/* ヘッダー */}
      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        📅 絆カレンダー
      </h3>

      {/* ストリーク & サマリー */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
        <span className="text-sm font-bold text-purple-300">
          🔥 連続{streak}日
        </span>
        <span className="text-xs text-gray-400">
          今月は{thisMonthDays}日会話しました
        </span>
        {topCharacter && (
          <span className="text-xs text-gray-400">
            最も話したキャラ: <span className="text-purple-300 font-medium">{topCharacter}</span>
          </span>
        )}
      </div>

      {/* カレンダーグリッド */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 'fit-content' }}>
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="w-8 text-center text-xs text-gray-600 font-medium"
              >
                {d}
              </div>
            ))}
          </div>

          {/* 日付セル */}
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((dateStr, idx) => {
              if (dateStr === null) {
                // 空セル
                return <div key={`empty-${idx}`} className="w-8 h-8" />;
              }

              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const count = days[dateStr] ?? 0;
              const colorClass = getCellColor(count);

              if (isFuture) {
                // 未来の日付は非表示
                return <div key={dateStr} className="w-8 h-8" />;
              }

              return (
                <div
                  key={dateStr}
                  title={`${dateStr}: ${count}回`}
                  className={`w-8 h-8 rounded-md ${colorClass} ${
                    isToday ? 'ring-2 ring-purple-400' : ''
                  } transition-all`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-gray-600">少</span>
        {['bg-gray-800', 'bg-purple-900', 'bg-purple-700', 'bg-purple-500', 'bg-purple-400'].map((c) => (
          <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-gray-600">多</span>
      </div>

      {/* 月次サマリー */}
      <p className="text-xs text-gray-600 mt-3 border-t border-white/5 pt-3">
        {currentMonth}月は{thisMonthDays}日間推しと会話
        {streak > 0 && ` | 最長ストリーク: ${streak}日`}
        {totalDays > 0 && ` | 合計${totalDays}日`}
      </p>
    </section>
  );
}
