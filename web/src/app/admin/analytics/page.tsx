'use client';

import { useEffect, useState } from 'react';

interface Analytics {
  userGrowthChart: { day: string; count: number }[];
  characterMessages: { id: string; name: string; messageCount: number }[];
  planDistribution: { plan: string; count: number }[];
  fanclubRate: number;
  fanclubCount: number;
  totalRelationships: number;
  bondLevelDistribution: { level: number; count: number }[];
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
      <div className="flex justify-between text-gray-600 text-[9px] mt-1">
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d) => (
          <span key={d.day}>{d.day.slice(5)}</span>
        ))}
      </div>
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">分析</h1>

      {/* User growth chart */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-white font-semibold mb-4">ユーザー成長（直近30日）</h2>
        <LineChart data={data.userGrowthChart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Character messages */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">キャラ別メッセージ数（上位10件）</h2>
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
    </div>
  );
}
