'use client';

import { useState } from 'react';

const EXPORT_TARGETS = [
  { value: 'users', label: 'ユーザー', icon: '👥', desc: 'ユーザー基本情報・プラン・コイン残高' },
  { value: 'conversations', label: '会話ログ', icon: '💬', desc: '全チャットメッセージ（最大10,000件）' },
  { value: 'revenue', label: '収益', icon: '💰', desc: 'コイン購入トランザクション' },
  { value: 'characters', label: 'キャラ設定', icon: '✨', desc: 'キャラクター一覧・ステータス' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV', icon: '📊' },
  { value: 'json', label: 'JSON', icon: '📋' },
];

export default function ExportPage() {
  const [target, setTarget] = useState('users');
  const [format, setFormat] = useState('csv');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ target, format });
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch('/api/admin/export?' + params.toString());
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'エクスポートに失敗しました');
        return;
      }

      // Get filename from content-disposition
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `export.${format}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setLastExport(filename);
    } catch (err) {
      console.error(err);
      alert('エクスポートに失敗しました');
    } finally {
      setDownloading(false);
    }
  };

  const selectedTarget = EXPORT_TARGETS.find((t) => t.value === target);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">データエクスポート</h1>
        <p className="text-gray-500 text-sm mt-1">管理データのダウンロード（SUPER_ADMIN限定）</p>
      </div>

      {/* Target selection */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h2 className="text-sm font-semibold text-gray-300 mb-4">エクスポート対象</h2>
        <div className="grid grid-cols-2 gap-3">
          {EXPORT_TARGETS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTarget(t.value)}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: target === t.value
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.15))'
                  : 'rgba(255,255,255,0.04)',
                border: target === t.value
                  ? '1px solid rgba(168,85,247,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="text-sm font-semibold text-white">{t.label}</div>
              <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format selection */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h2 className="text-sm font-semibold text-gray-300 mb-4">フォーマット</h2>
        <div className="flex gap-3">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: format === f.value
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))'
                  : 'rgba(255,255,255,0.04)',
                border: format === f.value
                  ? '1px solid rgba(168,85,247,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: format === f.value ? 'white' : '#9ca3af',
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h2 className="text-sm font-semibold text-gray-300 mb-4">日付範囲（省略可）</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>
      </div>

      {/* Download button */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-300">
              {selectedTarget?.icon} {selectedTarget?.label} を {format.toUpperCase()} でエクスポート
            </p>
            {(from || to) && (
              <p className="text-xs text-gray-500 mt-1">
                {from || '開始なし'} 〜 {to || '終了なし'}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              エクスポート中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              ダウンロード
            </>
          )}
        </button>
        {lastExport && (
          <p className="text-xs text-green-400 mt-3 text-center">✓ {lastExport} をダウンロードしました</p>
        )}
      </div>
    </div>
  );
}
