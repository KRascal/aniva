'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── Emergency Stop Dialog ─────────────────────────────────────────────────

interface EmergencyStopDialogProps {
  onClose: () => void;
}

function EmergencyStopDialog({ onClose }: EmergencyStopDialogProps) {
  const [characters, setCharacters] = useState<{ id: string; name: string; slug: string; isActive: boolean }[]>([]);
  const [selectedChar, setSelectedChar] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/characters')
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d.characters ?? [];
        setCharacters(arr.filter((c: { isActive: boolean }) => c.isActive));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleStop() {
    if (!selectedChar) return;
    setStopping(true);
    try {
      const r = await fetch('/api/admin/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: selectedChar, reason }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult({ ok: true, message: data.message ?? '緊急停止しました' });
      } else {
        setResult({ ok: false, message: data.error ?? '停止に失敗しました' });
      }
    } catch {
      setResult({ ok: false, message: 'ネットワークエラー' });
    } finally {
      setStopping(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: '#1a0a2e', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl">🚨</div>
          <div>
            <h2 className="text-lg font-bold text-white">緊急停止</h2>
            <p className="text-xs text-red-300">キャラクターを即座にオフライン化します</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl text-sm ${
                result.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}
            >
              {result.message}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl text-sm font-medium text-gray-300 transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="text-gray-400 text-sm">読み込み中...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">停止するキャラクター *</label>
                  <select
                    value={selectedChar}
                    onChange={(e) => setSelectedChar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="">選択してください</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">停止理由（任意）</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="停止理由を入力..."
                    className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleStop}
                disabled={!selectedChar || stopping}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-40"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}
              >
                {stopping ? '停止中...' : '🚨 緊急停止実行'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
  {
    href: '/admin/characters',
    label: 'キャラクター管理',
    description: 'AIキャラの設定・編集',
    gradient: 'from-violet-500/20 to-purple-600/10',
    border: 'border-violet-500/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'ユーザー管理',
    description: '登録ユーザー一覧',
    gradient: 'from-sky-500/20 to-blue-600/10',
    border: 'border-sky-500/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    href: '/admin/analytics',
    label: '分析',
    description: 'KPI・行動分析',
    gradient: 'from-emerald-500/20 to-teal-600/10',
    border: 'border-emerald-500/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    href: '/admin/shop',
    label: 'ショップ',
    description: 'アイテム・販売管理',
    gradient: 'from-amber-500/20 to-orange-600/10',
    border: 'border-amber-500/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
      </svg>
    ),
  },
  {
    href: '/admin/approvals',
    label: '監修・承認',
    description: 'IPホルダー承認フロー',
    gradient: 'from-rose-500/20 to-pink-600/10',
    border: 'border-rose-500/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
      </svg>
    ),
  },
  {
    href: '/admin/guardrails',
    label: 'ガードレール',
    description: 'AIコンテンツ制御',
    gradient: 'from-indigo-500/20 to-violet-600/10',
    border: 'border-indigo-500/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
];

function formatRevenue(amount: number): string {
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`;
  return `¥${amount.toLocaleString()}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function SmoothAreaChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.count), 1);
  const min = Math.min(...data.map((d) => d.count));
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.count - min) / range) * chartH,
    ...d,
  }));

  // Create smooth bezier path
  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: '120px' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            y1={padding.top + t * chartH}
            x2={padding.left + chartW}
            y2={padding.top + t * chartH}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2"
          filter="url(#glow)"
        />
        {/* Data points */}
        {points.map((pt) => (
          <circle
            key={pt.date}
            cx={pt.x}
            cy={pt.y}
            r="3"
            fill="#a855f7"
            stroke="#1a0a2e"
            strokeWidth="2"
          />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between px-2">
        {data.map((d) => (
          <span key={d.date} className="text-xs text-gray-600">
            {d.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className={`relative rounded-2xl p-5 border overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${accent}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(168,85,247,0.08), transparent 70%)' }} />

      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tight mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{sub}</span>
        {trend && (
          <span className="text-xs text-emerald-400 font-medium">{trend}</span>
        )}
      </div>
    </div>
  );
}

interface CharacterLaunchSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  score: number;
  isActive: boolean;
  canLaunch: boolean;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmergencyStop, setShowEmergencyStop] = useState(false);
  const [launchSummaries, setLaunchSummaries] = useState<CharacterLaunchSummary[]>([]);

  useEffect(() => {
    // キャラ別ローンチ状態を並列取得
    fetch('/api/admin/characters')
      .then(r => r.ok ? r.json() : [])
      .then(async (chars: { id: string; name: string; slug: string; avatarUrl: string | null; isActive: boolean }[]) => {
        const arr = Array.isArray(chars) ? chars : [];
        // 最大6キャラ分のlaunch-statusを並列取得
        const summaries = await Promise.all(
          arr.slice(0, 6).map(async (c) => {
            try {
              const res = await fetch(`/api/admin/characters/${c.id}/launch-status`);
              if (!res.ok) return { ...c, score: 0, canLaunch: false };
              const d = await res.json();
              return { id: c.id, name: c.name, slug: c.slug, avatarUrl: c.avatarUrl, score: d.score, isActive: d.isActive, canLaunch: d.canLaunch };
            } catch {
              return { id: c.id, name: c.name, slug: c.slug, avatarUrl: c.avatarUrl, score: 0, isActive: c.isActive, canLaunch: false };
            }
          })
        );
        setLaunchSummaries(summaries);
      })
      .catch(() => {});
  }, []);

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

  const kpiCards = [
    {
      label: 'DAU',
      value: loading ? '—' : formatNumber(data?.today.dau ?? 0),
      sub: '今日のアクティブユーザー',
      accent: 'border-violet-500/20',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
    {
      label: '新規登録',
      value: loading ? '—' : formatNumber(data?.today.newUsers ?? 0),
      sub: '今日の新規ユーザー',
      accent: 'border-sky-500/20',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'メッセージ数',
      value: loading ? '—' : formatNumber(data?.today.totalMessages ?? 0),
      sub: '今日の送信数',
      accent: 'border-pink-500/20',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
    },
    {
      label: 'コイン収益',
      value: loading ? '—' : formatRevenue(data?.today.revenue ?? 0),
      sub: '今日の購入額',
      accent: 'border-amber-500/20',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="min-h-full space-y-8 pb-12"
      style={{ color: '#e2e8f0' }}
    >
      {/* Emergency Stop Dialog */}
      {showEmergencyStop && <EmergencyStopDialog onClose={() => setShowEmergencyStop(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
            >
              A
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">管理者ポータル</h1>
              <p className="text-gray-500 text-xs">
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Alert badge */}
          {!loading && totalAlerts > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {totalAlerts}件の要対応
            </div>
          )}
          {/* Emergency Stop Button */}
          <button
            onClick={() => setShowEmergencyStop(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-500/20"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
            title="緊急停止"
          >
            <span>🚨</span>
            緊急停止
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            更新
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl p-4 text-sm flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          データの取得に失敗しました: {error}
        </div>
      )}

      {/* KPI Cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Today&apos;s KPI</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      {/* Alerts + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">アラート</h2>
            {!loading && totalAlerts > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {totalAlerts}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          ) : totalAlerts === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full mb-3 flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)' }}>
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">すべて正常です</p>
              <p className="text-xs text-gray-600 mt-1">要対応のアラートなし</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data!.alerts.reportCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-red-300">未処理の通報</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                    {data!.alerts.reportCount}件
                  </span>
                </div>
              )}
              {data!.alerts.lowStreakCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-amber-300">低ストリーク</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.25)', color: '#fcd34d' }}>
                    {data!.alerts.lowStreakCount}人
                  </span>
                </div>
              )}
              {data!.alerts.errorCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-sm text-purple-300">エラーログ</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(168,85,247,0.25)', color: '#d8b4fe' }}>
                    {data!.alerts.errorCount}件
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Weekly DAU Chart */}
        <section
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">DAU 推移</h2>
              <p className="text-xs text-gray-500 mt-0.5">直近7日間</p>
            </div>
            {!loading && data && data.weeklyDau.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatNumber(data.weeklyDau[data.weeklyDau.length - 1]?.count ?? 0)}
                </div>
                <div className="text-xs text-gray-500">最新日</div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                読み込み中...
              </div>
            </div>
          ) : data && data.weeklyDau.length > 0 ? (
            <SmoothAreaChart data={data.weeklyDau} />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              データなし
            </div>
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">クイックアクセス</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group relative rounded-2xl p-4 border transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${action.border} bg-gradient-to-br ${action.gradient}`}
            >
              <div className="mb-3 text-gray-400 group-hover:text-white transition-colors">
                {action.icon}
              </div>
              <div className="text-sm font-semibold text-white leading-tight mb-0.5">
                {action.label}
              </div>
              <div className="text-xs text-gray-500 leading-tight">{action.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* キャラ別ローンチ状態 */}
      {launchSummaries.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">キャラ別ローンチ状態</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <Link href="/admin/characters" className="text-xs text-purple-400 hover:text-purple-300">全て表示 →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {launchSummaries.map((c) => {
              const barColor = c.score >= 80 ? '#22c55e' : c.score >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <Link
                  key={c.id}
                  href={`/admin/characters/${c.id}/launch`}
                  className="group flex items-center gap-3 rounded-xl border border-white/8 px-4 py-3 hover:bg-white/5 transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                        {c.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{c.name}</span>
                      {c.isActive ? (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full shrink-0">公開中</span>
                      ) : c.canLaunch ? (
                        <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">公開可能</span>
                      ) : (
                        <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">準備中</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${c.score}%`, background: barColor }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{c.score}%</span>
                    </div>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 text-xs transition-colors">→</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
