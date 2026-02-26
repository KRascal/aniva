'use client';

import { useEffect, useState } from 'react';

interface ActivityItem {
  type: 'conversation' | 'registration' | 'payment';
  id: string;
  userEmail: string | null;
  userName: string | null;
  characterName: string | null;
  characterAvatar: string | null;
  amount?: number;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalConversations: number;
  monthlyNewUsers: number;
  monthlyRevenueJpy: number;
  prevMonthRevenueJpy: number;
  totalUsersGrowth: number;
  activeUsersGrowth: number;
  totalMessagesGrowth: number;
  newUsersGrowth: number;
  subscriptions: { total: number; byPlan: { plan: string; count: number }[] };
  topCharacters: {
    id: string;
    name: string;
    franchise: string;
    messageCount: number;
    followerCount: number;
    isActive: boolean;
    avatarUrl: string | null;
  }[];
  newUsersChart: { day: string; count: number }[];
  conversationsChart: { day: string; count: number }[];
  activityFeed: ActivityItem[];
}

// KPI Card with trend indicator and sparkle accent
function KpiCard({
  label,
  value,
  icon,
  growth,
  growthLabel,
  accent,
  subLabel,
}: {
  label: string;
  value: string | number;
  icon: string;
  growth?: number;
  growthLabel?: string;
  accent?: string;
  subLabel?: string;
}) {
  const isPositive = (growth ?? 0) >= 0;
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 relative overflow-hidden group hover:border-gray-700 transition-colors">
      {/* Glow accent */}
      {accent && (
        <div
          className="absolute -top-4 -right-4 w-28 h-28 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
          style={{ background: accent }}
        />
      )}
      {/* Top accent line */}
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      )}
      <div className="flex items-start justify-between mb-3">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl"
          style={{ background: accent ? `${accent}20` : 'rgba(255,255,255,0.05)' }}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1 tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subLabel && <div className="text-gray-600 text-xs mb-1">{subLabel}</div>}
      {growth !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <span className="text-base leading-none">{isPositive ? '↑' : '↓'}</span>
          <span className="font-bold">{Math.abs(growth).toFixed(1)}%</span>
          {growthLabel && <span className="text-gray-600 font-normal ml-0.5">{growthLabel}</span>}
        </div>
      )}
    </div>
  );
}

// Bar chart with labels, gradient, and peak indicator
function BarChart({
  data,
  gradientFrom = '#7c3aed',
  gradientTo = '#a78bfa',
  label,
  accentColor = 'text-purple-400',
}: {
  data: { day: string; count: number }[];
  gradientFrom?: string;
  gradientTo?: string;
  label?: string;
  accentColor?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const peakDay = data.reduce((a, b) => (a.count >= b.count ? a : b), data[0]);
  const avgPerDay = data.length > 0 ? Math.round(total / data.length) : 0;

  const formatDay = (day: string) => {
    const d = new Date(day);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const gradId = `grad-${gradientFrom.replace('#', '')}`;

  return (
    <div>
      {label && (
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-white font-semibold">{label}</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-gray-500 text-xs">合計 <span className={`font-semibold ${accentColor}`}>{total.toLocaleString()}</span></span>
              <span className="text-gray-500 text-xs">平均 <span className="text-gray-300 font-medium">{avgPerDay.toLocaleString()}/日</span></span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${accentColor}`}>{total.toLocaleString()}</div>
            <div className="text-gray-500 text-xs mt-0.5">7日間</div>
          </div>
        </div>
      )}
      {/* SVG gradient definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} stopOpacity="1" />
            <stop offset="100%" stopColor={gradientTo} stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d) => {
          const isPeak = d.day === peakDay.day && d.count > 0;
          const barH = Math.max((d.count / max) * 120, d.count > 0 ? 4 : 2);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="relative w-full flex flex-col items-center">
                {/* Tooltip on hover */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl border border-gray-600">
                  <span className="font-semibold">{d.count.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">{formatDay(d.day)}</span>
                </div>
                {/* Peak indicator */}
                {isPeak && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                )}
                <div
                  className="w-full rounded-t transition-all relative overflow-hidden"
                  style={{
                    height: `${barH}px`,
                    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo}80)`,
                    boxShadow: isPeak ? `0 -2px 12px ${gradientFrom}60` : undefined,
                  }}
                >
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, white 0%, transparent 100%)' }} />
                </div>
              </div>
              <span className="text-gray-500 text-[10px]">{formatDay(d.day)}</span>
            </div>
          );
        })}
      </div>
      {/* Baseline */}
      <div className="mt-1 h-px bg-gray-700/60 w-full" />
    </div>
  );
}

// Activity feed item
function ActivityRow({ item }: { item: ActivityItem }) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'たった今';
    if (mins < 60) return `${mins}分前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}時間前`;
    return `${Math.floor(hrs / 24)}日前`;
  };

  const icons = {
    conversation: { emoji: '💬', bg: 'bg-blue-900/40', text: '会話開始' },
    registration: { emoji: '👤', bg: 'bg-green-900/40', text: '新規登録' },
    payment: { emoji: '💳', bg: 'bg-yellow-900/40', text: '課金' },
  };
  const meta = icons[item.type];
  const userName = item.userName || item.userEmail?.split('@')[0] || 'ユーザー';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-800/60 last:border-0">
      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0 text-sm`}>
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-white font-medium truncate max-w-[100px]">{userName}</span>
          <span className="text-gray-500">が</span>
          {item.type === 'conversation' && (
            <>
              <span className="text-blue-400 font-medium truncate max-w-[80px]">{item.characterName}</span>
              <span className="text-gray-500">と会話</span>
            </>
          )}
          {item.type === 'registration' && (
            <span className="text-green-400 font-medium">新規登録</span>
          )}
          {item.type === 'payment' && (
            <>
              <span className="text-yellow-400 font-medium">¥{item.amount?.toLocaleString()}</span>
              <span className="text-gray-500">課金</span>
              {item.characterName && (
                <span className="text-gray-400 text-xs ml-1 truncate">({item.characterName})</span>
              )}
            </>
          )}
        </div>
      </div>
      <span className="text-gray-600 text-xs shrink-0">{timeAgo(item.createdAt)}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
        setLastUpdated(new Date());
      })
      .catch(() => {
        setError('データの取得に失敗しました');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // Auto-refresh every 60s
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 flex items-center gap-2">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        読み込み中...
      </div>
    </div>
  );
  if (error) return <div className="text-red-400">{error}</div>;
  if (!stats) return null;

  const revenueGrowth = stats.prevMonthRevenueJpy > 0
    ? ((stats.monthlyRevenueJpy - stats.prevMonthRevenueJpy) / stats.prevMonthRevenueJpy) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-gray-500 text-xs">
              更新: {lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {loading ? (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : '↻'} 更新
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="アクティブユーザー"
          value={stats.activeUsers}
          icon="⚡"
          growth={stats.activeUsersGrowth}
          growthLabel="vs 昨日"
          accent="#7c3aed"
        />
        <KpiCard
          label="総会話数"
          value={(stats.totalConversations ?? stats.totalMessages).toLocaleString()}
          icon="💬"
          accent="#2563eb"
        />
        <KpiCard
          label="今月売上"
          value={`¥${stats.monthlyRevenueJpy.toLocaleString()}`}
          icon="💴"
          growth={revenueGrowth}
          growthLabel="vs 先月"
          accent="#d97706"
        />
        <KpiCard
          label="新規登録（今月）"
          value={stats.monthlyNewUsers ?? 0}
          icon="🆕"
          growth={stats.newUsersGrowth}
          growthLabel="vs 先月"
          accent="#059669"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations chart */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-3xl bg-purple-500 pointer-events-none" />
          <BarChart
            data={stats.conversationsChart}
            gradientFrom="#7c3aed"
            gradientTo="#a78bfa"
            label="会話数（直近7日）"
            accentColor="text-purple-400"
          />
        </div>

        {/* New users chart */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-3xl bg-blue-500 pointer-events-none" />
          <BarChart
            data={stats.newUsersChart}
            gradientFrom="#2563eb"
            gradientTo="#60a5fa"
            label="新規登録（直近7日）"
            accentColor="text-blue-400"
          />
        </div>
      </div>

      {/* Bottom row: character ranking + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character ranking with avatars */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">🏆 キャラ人気ランキング</h2>
            <span className="text-gray-500 text-xs">メッセージ数順</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {stats.topCharacters.length === 0 ? (
              <p className="text-gray-500 text-sm p-5">データなし</p>
            ) : (
              stats.topCharacters.slice(0, 8).map((c, i) => {
                const maxMsgs = Math.max(...stats.topCharacters.map((x) => x.messageCount), 1);
                const pct = (c.messageCount / maxMsgs) * 100;
                const rankColors = ['text-yellow-400', 'text-gray-300', 'text-yellow-600'];
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition-colors">
                    {/* Rank */}
                    <span className={`text-sm font-bold w-5 text-center shrink-0 ${rankColors[i] || 'text-gray-500'}`}>
                      {i + 1}
                    </span>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden shrink-0 border border-gray-600">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                          {c.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium truncate">{c.name}</span>
                        <span className="text-gray-500 text-xs truncate">{c.franchise}</span>
                        {!c.isActive && (
                          <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded shrink-0">停止中</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {/* Counts */}
                    <div className="text-right shrink-0">
                      <div className="text-white text-sm font-medium">{c.messageCount.toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">{c.followerCount} フォロワー</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="p-5 border-b border-gray-800">
            <h2 className="text-white font-semibold">🔔 最近のアクティビティ</h2>
          </div>
          <div className="p-4 overflow-y-auto max-h-[400px]">
            {stats.activityFeed.length === 0 ? (
              <p className="text-gray-500 text-sm">アクティビティなし</p>
            ) : (
              stats.activityFeed.map((item) => (
                <ActivityRow key={`${item.type}-${item.id}`} item={item} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subscription breakdown */}
      {stats.subscriptions.byPlan.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">プラン別サブスクリプション</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.subscriptions.byPlan.map((p) => {
              const pct = stats.subscriptions.total > 0
                ? ((p.count / stats.subscriptions.total) * 100).toFixed(1)
                : '0';
              const colors: Record<string, string> = { FREE: 'bg-gray-500', STANDARD: 'bg-purple-500', PREMIUM: 'bg-yellow-500' };
              return (
                <div key={p.plan} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300 text-sm font-medium">{p.plan}</span>
                    <span className="text-gray-400 text-sm">{pct}%</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{p.count.toLocaleString()}</div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[p.plan] || 'bg-blue-500'} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
