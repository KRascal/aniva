'use client';

import { useCallback, useEffect, useState } from 'react';

interface HealthData {
  db?: { status: string; responseTimeMs: number };
  health?: { status: string; httpStatus: number; responseTimeMs: number };
  redis?: { status: string; responseTimeMs?: number; error?: string };
  memory?: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    systemTotalMB: number;
    systemFreeMB: number;
    systemUsedPercent: number;
  };
  cpu?: { cores: number; model: string; loadAvg: number[] };
  uptime?: { processSeconds: number; systemSeconds: number };
  timestamp?: string;
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === 'ok';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      {ok ? '正常' : 'エラー'}
    </span>
  );
}

function MetricCard({ title, value, sub, status }: { title: string; value: string; sub?: string; status?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-neutral-400">{title}</p>
        {status && <StatusBadge status={status} />}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間 ${Math.floor((seconds % 3600) / 60)}分`;
  return `${Math.floor(seconds / 86400)}日 ${Math.floor((seconds % 86400) / 3600)}時間`;
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error('取得に失敗しました');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // 30秒毎に自動更新
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">ヘルスモニター</h1>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            '↻'
          )}
          更新
        </button>
      </div>
      {data?.timestamp && (
        <p className="text-xs text-neutral-500 mb-6">最終更新: {new Date(data.timestamp).toLocaleString('ja-JP')}</p>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* 接続ステータス */}
          <section>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">接続ステータス</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="データベース (PostgreSQL)"
                value={data.db?.status === 'ok' ? '正常' : 'エラー'}
                sub={data.db ? `応答: ${data.db.responseTimeMs}ms` : undefined}
                status={data.db?.status}
              />
              <MetricCard
                title="APIヘルス (/api/health)"
                value={data.health?.status === 'ok' ? '正常' : 'エラー'}
                sub={data.health ? `応答: ${data.health.responseTimeMs}ms | HTTP ${data.health.httpStatus}` : undefined}
                status={data.health?.status}
              />
              <MetricCard
                title="Redis"
                value={data.redis?.status === 'ok' ? '正常' : 'エラー'}
                sub={data.redis?.responseTimeMs ? `応答: ${data.redis.responseTimeMs}ms` : data.redis?.error}
                status={data.redis?.status}
              />
            </div>
          </section>

          {/* メモリ */}
          {data.memory && (
            <section>
              <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">メモリ使用量</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Heapメモリ (使用中)" value={`${data.memory.heapUsedMB} MB`} sub={`最大: ${data.memory.heapTotalMB} MB`} />
                <MetricCard title="RSSメモリ" value={`${data.memory.rssMB} MB`} />
                <MetricCard title="システムメモリ (使用率)" value={`${data.memory.systemUsedPercent}%`} sub={`空き: ${data.memory.systemFreeMB} MB / 合計: ${data.memory.systemTotalMB} MB`} />
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <p className="text-sm text-neutral-400 mb-3">メモリ使用率</p>
                  <div className="w-full bg-neutral-700 rounded-full h-3 mb-1">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        data.memory.systemUsedPercent > 85 ? 'bg-red-500' : data.memory.systemUsedPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${data.memory.systemUsedPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">{data.memory.systemUsedPercent}%</p>
                </div>
              </div>
            </section>
          )}

          {/* CPU + 稼働時間 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.cpu && (
              <section>
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">CPU</h2>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">コア数</span>
                    <span className="text-white">{data.cpu.cores}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">モデル</span>
                    <span className="text-white text-xs truncate max-w-[200px]">{data.cpu.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">負荷平均 (1分)</span>
                    <span className="text-white">{data.cpu.loadAvg[0]?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">負荷平均 (5分)</span>
                    <span className="text-white">{data.cpu.loadAvg[1]?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">負荷平均 (15分)</span>
                    <span className="text-white">{data.cpu.loadAvg[2]?.toFixed(2)}</span>
                  </div>
                </div>
              </section>
            )}

            {data.uptime && (
              <section>
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">稼働時間</h2>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Nodeプロセス</span>
                    <span className="text-white">{formatUptime(data.uptime.processSeconds)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">システム</span>
                    <span className="text-white">{formatUptime(data.uptime.systemSeconds)}</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          <p className="text-xs text-neutral-600 text-right">30秒毎に自動更新</p>
        </div>
      ) : null}
    </div>
  );
}
