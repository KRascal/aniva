'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  today: {
    dau: number;
    newUsers: number;
    totalMessages: number;
    revenue: number;
  };
  alerts: {
    reportCount: number;
    lowStreakCount: number;
    errorCount: number;
  };
  weeklyDau: { date: string; count: number }[];
}

const QUICK_ACTIONS = [
  { href: '/admin/characters', label: 'キャラクター管理', icon: '🎭' },
  { href: '/admin/users', label: 'ユーザー管理', icon: '👥' },
  { href: '/admin/moments', label: 'モーメンツ', icon: '📸' },
  { href: '/admin/analytics', label: '分析', icon: '📈' },
  { href: '/admin/shop', label: 'ショップ', icon: '🛍' },
  { href: '/admin/gacha', label: 'ガチャ', icon: '🎰' },
  { href: '/admin/scenarios', label: '限定シナリオ', icon: '📖' },
  { href: '/admin/addiction', label: '中毒設計', icon: '🧪' },
  { href: '/admin/polls', label: '投票管理', icon: '🗳' },
  { href: '/admin/downloadable-content', label: '限定DLC', icon: '📦' },
];

function formatRevenue(amount: number): string {
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`;
  return `¥${amount.toLocaleString()}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function WeeklyChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => {
        const height = Math.round((d.count / max) * 100);
        const label = d.date.slice(5); // MM-DD
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-gray-500 text-xs">{d.count}</span>
            <div
              className="w-full rounded-t-sm bg-purple-500/70 transition-all duration-500 min-h-[4px]"
              style={{ height: `${height}%` }}
            />
            <span className="text-gray-500 text-xs">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard');
        return r.json();
      })
      .then((d: DashboardData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const totalAlerts = data
    ? data.alerts.reportCount + data.alerts.lowStreakCount + data.alerts.errorCount
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ANIVA 管理ダッシュボード</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
        >
          🔄 更新
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          ⚠️ データの取得に失敗しました: {error}
        </div>
      )}

      {/* 今日のサマリー */}
      <section>
        <h2 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
          📊 今日のサマリー
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'DAU',
              value: loading ? '—' : formatNumber(data?.today.dau ?? 0),
              icon: '👤',
              sub: '今日のアクティブ',
            },
            {
              label: '新規登録',
              value: loading ? '—' : formatNumber(data?.today.newUsers ?? 0),
              icon: '✨',
              sub: '今日の新規',
            },
            {
              label: 'チャット数',
              value: loading ? '—' : formatNumber(data?.today.totalMessages ?? 0),
              icon: '💬',
              sub: '今日の送信数',
            },
            {
              label: 'コイン収益',
              value: loading ? '—' : formatRevenue(data?.today.revenue ?? 0),
              icon: '🪙',
              sub: '今日の購入',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-gray-900 rounded-xl p-5 border border-white/5 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <div className="text-3xl font-bold text-white tabular-nums">{card.value}</div>
              <div className="text-gray-500 text-xs">{card.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 要対応アラート */}
      {!loading && totalAlerts > 0 && (
        <section>
          <h2 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
            🔔 要対応
          </h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 space-y-2">
            {data!.alerts.reportCount > 0 && (
              <div className="flex items-center gap-2 text-red-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                未処理の通報: {data!.alerts.reportCount}件
              </div>
            )}
            {data!.alerts.lowStreakCount > 0 && (
              <div className="flex items-center gap-2 text-orange-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                低ストリークユーザー: {data!.alerts.lowStreakCount}人
              </div>
            )}
            {data!.alerts.errorCount > 0 && (
              <div className="flex items-center gap-2 text-yellow-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                エラーログ: {data!.alerts.errorCount}件
              </div>
            )}
          </div>
        </section>
      )}

      {!loading && totalAlerts === 0 && data && (
        <section>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-sm">
            ✅ 現在、要対応のアラートはありません
          </div>
        </section>
      )}

      {/* クイックアクション */}
      <section>
        <h2 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
          📱 クイックアクション
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors group"
            >
              <div className="text-2xl mb-1">{action.icon}</div>
              <div className="text-gray-300 group-hover:text-white text-xs font-medium leading-tight">
                {action.label}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 直近7日DAU */}
      <section>
        <h2 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
          📈 直近7日間 DAU推移
        </h2>
        <div className="bg-gray-900 rounded-xl p-6 border border-white/5">
          {loading ? (
            <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
              読み込み中...
            </div>
          ) : data && data.weeklyDau.length > 0 ? (
            <WeeklyChart data={data.weeklyDau} />
          ) : (
            <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
              データなし
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
