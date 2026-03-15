'use client';

import { useState } from 'react';

interface TimelineEvent {
  type: string;
  label: string;
  detail: string;
  date: string;
}

interface UserLifecycle {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    plan: string;
    createdAt: string;
    lastLogin: string | null;
    status: 'active' | 'dormant' | 'churn_risk' | 'churn_planned';
    totalPurchases: number;
    totalCoinsPurchased: number;
    activeSubscriptions: string[];
    relationshipCount: number;
  };
  timeline: TimelineEvent[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'アクティブ', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  dormant: { label: '休眠', color: '#facc15', bg: 'rgba(250,204,21,0.15)' },
  churn_risk: { label: '離脱リスク', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  churn_planned: { label: '退会予定', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
};

const EVENT_ICONS: Record<string, string> = {
  registered: '🎉',
  first_chat: '💬',
  fc_join: '⭐',
  purchase: '💰',
  last_login: '🔑',
};

const EVENT_COLORS: Record<string, string> = {
  registered: '#7c3aed',
  first_chat: '#06b6d4',
  fc_join: '#f59e0b',
  purchase: '#10b981',
  last_login: '#8b5cf6',
};

export default function UserLifecyclePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UserLifecycle | null>(null);
  const [error, setError] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/user-lifecycle?q=' + encodeURIComponent(query.trim()));
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'エラーが発生しました');
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError('ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">ユーザーライフサイクル</h1>
        <p className="text-gray-500 text-sm mt-1">ユーザーの行動タイムラインと状態を確認（SUPER_ADMIN限定）</p>
      </div>

      {/* Search */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="メールアドレス or ユーザーID"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            onClick={search}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-5">
          {/* User card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-bold text-white">
                    {result.user.displayName || result.user.email || result.user.id}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      color: STATUS_LABELS[result.user.status]?.color,
                      background: STATUS_LABELS[result.user.status]?.bg,
                    }}
                  >
                    {STATUS_LABELS[result.user.status]?.label ?? result.user.status}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{result.user.email}</p>
                <p className="text-gray-600 text-xs mt-1">ID: {result.user.id}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'プラン', value: result.user.plan },
                  { label: '関係数', value: result.user.relationshipCount.toString() },
                  { label: '課金回数', value: result.user.totalPurchases.toString() },
                  { label: '取得コイン', value: result.user.totalCoinsPurchased.toLocaleString() },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {result.user.activeSubscriptions.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs text-gray-500 mb-2">アクティブFC</p>
                <div className="flex flex-wrap gap-2">
                  {result.user.activeSubscriptions.map((name) => (
                    <span
                      key={name}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(219,39,119,0.15)', color: '#fbcfe8', border: '1px solid rgba(219,39,119,0.2)' }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h3 className="text-sm font-semibold text-gray-300 mb-5">行動タイムライン</h3>
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-[18px] top-0 bottom-0 w-px"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              />
              <div className="space-y-4">
                {result.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    {/* Icon dot */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 z-10"
                      style={{
                        background: EVENT_COLORS[event.type] ?? '#6b7280',
                        boxShadow: `0 0 0 3px rgba(10,10,18,1), 0 0 0 4px ${EVENT_COLORS[event.type] ?? '#6b7280'}30`,
                      }}
                    >
                      {EVENT_ICONS[event.type] ?? '●'}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{event.label}</span>
                        <span className="text-xs text-gray-600">
                          {new Date(event.date).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5">{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
