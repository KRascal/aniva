'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  subscriptions: { total: number; byPlan: { plan: string; count: number }[] };
  topCharacters: { id: string; name: string; franchise: string; messageCount: number; followerCount: number; isActive: boolean }[];
  newUsersChart: { day: string; count: number }[];
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}

function BarChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-purple-600 rounded-sm min-h-[2px] transition-all"
            style={{ height: `${(d.count / max) * 100}%` }}
            title={`${d.day}: ${d.count}`}
          />
          <span className="text-gray-600 text-[9px] hidden sm:block">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError('データの取得に失敗しました');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-gray-400">読み込み中...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="総ユーザー数" value={stats.totalUsers} icon="👤" />
        <StatCard label="アクティブ (24h)" value={stats.activeUsers} icon="⚡" />
        <StatCard label="総メッセージ数" value={stats.totalMessages} icon="💬" />
        <StatCard label="サブスクリプション" value={stats.subscriptions.total} icon="💎" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New users chart */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">新規登録（直近7日）</h2>
          <BarChart data={stats.newUsersChart} />
        </div>

        {/* Subscription breakdown */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">プラン別サブスクリプション</h2>
          <div className="space-y-3">
            {stats.subscriptions.byPlan.length === 0 ? (
              <p className="text-gray-500 text-sm">データなし</p>
            ) : (
              stats.subscriptions.byPlan.map((p) => (
                <div key={p.plan} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm capitalize">{p.plan}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(p.count / (stats.subscriptions.total || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium w-8 text-right">{p.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Popular characters */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-white font-semibold">人気キャラランキング（メッセージ数順）</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm px-6 py-3">#</th>
                <th className="text-left text-gray-400 text-sm px-6 py-3">キャラ</th>
                <th className="text-left text-gray-400 text-sm px-6 py-3">フランチャイズ</th>
                <th className="text-right text-gray-400 text-sm px-6 py-3">メッセージ</th>
                <th className="text-right text-gray-400 text-sm px-6 py-3">フォロワー</th>
                <th className="text-center text-gray-400 text-sm px-6 py-3">状態</th>
              </tr>
            </thead>
            <tbody>
              {stats.topCharacters.map((c, i) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-6 py-3 text-gray-500 text-sm">{i + 1}</td>
                  <td className="px-6 py-3 text-white text-sm font-medium">{c.name}</td>
                  <td className="px-6 py-3 text-gray-400 text-sm">{c.franchise}</td>
                  <td className="px-6 py-3 text-right text-white text-sm">{c.messageCount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-gray-300 text-sm">{c.followerCount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {c.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.topCharacters.length === 0 && (
            <p className="text-gray-500 text-sm p-6">キャラクターがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
