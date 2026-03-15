'use client';

import { useEffect, useState } from 'react';

interface Analytics {
  userGrowthChart: { day: string; count: number }[];
  conversationsChart: { day: string; count: number }[];
  characterMessages: { id: string; name: string; messageCount: number }[];
  characterShare: { id: string; name: string; messageCount: number; share: number; colorIndex: number }[];
  planDistribution: { plan: string; count: number }[];
  fanclubRate: number;
  fanclubCount: number;
  totalRelationships: number;
  bondLevelDistribution: { level: number; count: number }[];
  retentionData: { label: string; registered: number; active: number; rate: number }[];
  totalConversations: number;
  // Today's KPIs
  todayActiveUsers: number;
  todayMessages: number;
  todayFanclubJoins: number;
  todayCoinSpend: number;
  popularPosts: { id: string; title: string; characterId: string; characterName: string; viewCount: number }[];
  dau7Days: { day: string; dau: number }[];
  todayCharMessages: { characterId: string; characterName: string; count: number }[];
}

function HBarChart({ data, labelKey, valueKey, colorClass = 'bg-purple-600' }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  colorClass?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 text-gray-400 text-xs truncate text-right">{String(d[labelKey])}</div>
          <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded transition-all`}
              style={{ width: `${(Number(d[valueKey]) / max) * 100}%` }}
            />
          </div>
          <div className="w-16 text-gray-300 text-xs text-right">{Number(d[valueKey]).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.count / max) * 90,
    ...d,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#grad)" />
        <path d={pathD} stroke="#7c3aed" strokeWidth="0.8" fill="none" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1" fill="#a78bfa" />
        ))}
      </svg>
      <div className="flex justify-between text-gray-600 text-xs mt-1">
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d) => (
          <span key={d.day}>{d.day.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

/** CSS bar chart for DAU 7-day (no Chart.js) */
function DauBarChart({ data }: { data: { day: string; dau: number }[] }) {
  const max = Math.max(...data.map((d) => d.dau), 1);
  return (
    <div className="flex items-end gap-2 h-32 mt-2">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-gray-400 text-xs">{d.dau}</span>
          <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
            <div
              className="w-full bg-violet-600 rounded-t transition-all"
              style={{ height: `${(d.dau / max) * 80}px`, minHeight: d.dau > 0 ? '2px' : '0' }}
            />
          </div>
          <span className="text-gray-500 text-xs">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-1">
      <div className="text-gray-400 text-xs">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-gray-500 text-xs">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('データの取得に失敗しました'); setLoading(false); });
  }, []);

  if (loading) return <div className="text-gray-400">読み込み中...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data) return null;

  const planColors: Record<string, string> = { FREE: 'bg-gray-500', STANDARD: 'bg-purple-500', PREMIUM: 'bg-yellow-500' };
  const totalUsers = data.planDistribution.reduce((s, r) => s + r.count, 0);
  const today = new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">分析</h1>

      {/* ── Today's KPIs ── */}
      <div>
        <h2 className="text-white font-semibold mb-3">📊 本日のKPI（{today}）</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="アクティブユーザー" value={data.todayActiveUsers} sub="本日チャット送信" color="text-green-400" />
          <KpiCard label="チャットメッセージ" value={data.todayMessages} sub="全キャラ合計" color="text-blue-400" />
          <KpiCard label="FC新規加入" value={data.todayFanclubJoins} sub="本日ファンクラブ加入" color="text-pink-400" />
          <KpiCard label="コイン消費量" value={data.todayCoinSpend} sub="本日合計消費" color="text-yellow-400" />
        </div>
      </div>

      {/* ── DAU 7-day bar chart ── */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-white font-semibold mb-2">DAU 直近7日</h2>
        <DauBarChart data={data.dau7Days} />
      </div>

      {/* ── Today messages by char ── */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-white font-semibold mb-4">本日のキャラ別メッセージ数</h2>
        {data.todayCharMessages.length === 0 ? (
          <p className="text-gray-500 text-sm">本日のデータなし</p>
        ) : (
          <HBarChart
            data={data.todayCharMessages.map((c) => ({ name: c.characterName, count: c.count }))}
            labelKey="name"
            valueKey="count"
            colorClass="bg-blue-600"
          />
        )}
      </div>

      {/* ── Popular posts ── */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-white font-semibold mb-4">人気投稿ランキング（閲覧数順）</h2>
        {data.popularPosts.length === 0 ? (
          <p className="text-gray-500 text-sm">投稿なし</p>
        ) : (
          <div className="space-y-2">
            {data.popularPosts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-gray-500 font-bold">{i + 1}</span>
                <span className="flex-1 text-gray-200 truncate">{p.title}</span>
                <span className="text-gray-400 text-xs">{p.characterName}</span>
                <span className="text-purple-400 font-medium w-16 text-right">{p.viewCount.toLocaleString()} views</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User growth chart */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-white font-semibold mb-4">ユーザー成長（直近30日）</h2>
        <LineChart data={data.userGrowthChart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Character messages */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">キャラ別メッセージ数（累計・上位10件）</h2>
          <HBarChart
            data={data.characterMessages as unknown as Record<string, unknown>[]}
            labelKey="name"
            valueKey="messageCount"
          />
          {data.characterMessages.length === 0 && <p className="text-gray-500 text-sm">データなし</p>}
        </div>

        {/* Plan distribution */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">プラン別ユーザー数</h2>
          <div className="space-y-4">
            {data.planDistribution.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-300 text-sm">{p.plan}</span>
                  <span className="text-white text-sm font-medium">{p.count.toLocaleString()} ({totalUsers > 0 ? ((p.count / totalUsers) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${planColors[p.plan] || 'bg-blue-500'} rounded-full`}
                    style={{ width: `${totalUsers > 0 ? (p.count / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fanclub rate */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">ファンクラブ加入率</h2>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#7c3aed" strokeWidth="3"
                  strokeDasharray={`${data.fanclubRate} ${100 - data.fanclubRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{data.fanclubRate.toFixed(1)}%</span>
                <span className="text-gray-500 text-xs">加入率</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-8 mt-2">
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">{data.fanclubCount.toLocaleString()}</div>
              <div className="text-gray-500 text-xs">ファンクラブ加入</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-400">{data.totalRelationships.toLocaleString()}</div>
              <div className="text-gray-500 text-xs">総リレーション</div>
            </div>
          </div>
        </div>

        {/* Bond level distribution */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">絆レベル分布</h2>
          {data.bondLevelDistribution.length === 0 ? (
            <p className="text-gray-500 text-sm">データなし</p>
          ) : (
            <HBarChart
              data={data.bondLevelDistribution.map((d) => ({ level: `Lv.${d.level}`, count: d.count }))}
              labelKey="level"
              valueKey="count"
              colorClass="bg-pink-600"
            />
          )}
        </div>
      </div>

      {/* Retention */}
      {data.retentionData && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">リテンション率</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.retentionData.map((r) => (
              <div key={r.label} className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-xs mb-1">{r.label}</div>
                <div className="text-2xl font-bold text-white">{r.rate.toFixed(1)}%</div>
                <div className="text-gray-500 text-xs mt-1">{r.active} / {r.registered} アクティブ</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
