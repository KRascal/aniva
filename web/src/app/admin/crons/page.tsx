'use client';

import { useCallback, useEffect, useState } from 'react';

interface CronJob {
  name: string;
  label: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
}

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/crons');
    const data = await res.json();
    setCrons(data.crons || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (name: string, currentEnabled: boolean) => {
    setToggling(name);
    try {
      const res = await fetch('/api/admin/crons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setCrons((prev) =>
          prev.map((c) => (c.name === name ? { ...c, enabled: !currentEnabled } : c))
        );
      }
    } finally {
      setToggling(null);
    }
  };

  const filtered = crons.filter((c) => {
    const matchesSearch = !search || c.name.includes(search) || c.label.includes(search) || c.description.includes(search);
    const matchesEnabled =
      filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && c.enabled) ||
      (filterEnabled === 'disabled' && !c.enabled);
    return matchesSearch && matchesEnabled;
  });

  const enabledCount = crons.filter((c) => c.enabled).length;
  const disabledCount = crons.filter((c) => !c.enabled).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Cron制御パネル</h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm transition-colors disabled:opacity-50"
        >
          ↻ 更新
        </button>
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        合計 {total} ジョブ / 有効 {enabledCount} / 無効 {disabledCount}
      </p>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="ジョブ名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
        />
        <div className="flex rounded overflow-hidden border border-neutral-700">
          {(['all', 'enabled', 'disabled'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterEnabled(v)}
              className={`px-3 py-2 text-sm transition-colors ${
                filterEnabled === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {v === 'all' ? '全て' : v === 'enabled' ? '有効' : '無効'}
            </button>
          ))}
        </div>
      </div>

      {/* 注意書き */}
      <div className="mb-6 p-3 bg-yellow-900/20 border border-yellow-800 rounded text-yellow-400 text-xs">
        ⚠️ ON/OFFはRedisフラグで管理します。各cronルートが <code className="bg-yellow-900/30 px-1 rounded">cron:{'{name}'}:disabled</code> を参照している場合のみ有効です。
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cron) => (
            <div
              key={cron.name}
              className={`bg-neutral-900 border rounded-lg p-4 transition-colors ${
                cron.enabled ? 'border-neutral-800' : 'border-neutral-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button
                  onClick={() => toggle(cron.name, cron.enabled)}
                  disabled={toggling === cron.name}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    cron.enabled ? 'bg-green-600' : 'bg-neutral-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      cron.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{cron.label}</span>
                    <span className="text-xs text-neutral-500 font-mono">{cron.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        cron.enabled
                          ? 'bg-green-900/30 text-green-400 border-green-800'
                          : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                      }`}
                    >
                      {cron.enabled ? '有効' : '無効'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{cron.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-neutral-400 font-mono">{cron.schedule}</p>
                  {cron.lastRun ? (
                    <p className="text-xs text-neutral-600 mt-0.5">
                      最終: {new Date(cron.lastRun).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-700 mt-0.5">未実行</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-neutral-500 text-sm">
              該当するジョブがありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}
