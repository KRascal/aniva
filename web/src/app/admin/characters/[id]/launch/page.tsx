'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { LaunchStatusResponse, LaunchCheck } from '@/app/api/admin/characters/[id]/launch-status/route';

// ── スコアリング円グラフ ──────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="rotate-[-90deg]">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── チェック行 ────────────────────────────────────────────────

function CheckRow({ check }: { check: LaunchCheck }) {
  const icon = check.passed
    ? <span className="text-emerald-400 text-lg">✅</span>
    : check.critical
      ? <span className="text-red-400 text-lg">❌</span>
      : <span className="text-amber-400 text-lg">⚠️</span>;

  const badge = check.count !== undefined && check.required !== undefined ? (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
      check.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'
    }`}>
      {check.count}/{check.required}
    </span>
  ) : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
      check.passed
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : check.critical
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-amber-500/20 bg-amber-500/5'
    }`}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{check.label}</span>
          {check.critical && !check.passed && (
            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">必須</span>
          )}
          {badge}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
      </div>
      {!check.passed && (
        <Link
          href={check.editPath}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all whitespace-nowrap"
        >
          設定する →
        </Link>
      )}
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────

export default function LaunchPage() {
  const params = useParams<{ id: string }>();
  const characterId = params.id;

  const [data, setData] = useState<LaunchStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/launch-status`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [characterId]);

  const handleLaunch = async () => {
    if (!data?.canLaunch) return;
    setLaunching(true);
    setLaunchResult(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        setLaunchResult({ ok: true, message: '🚀 キャラクターを本番公開しました！' });
        await load();
      } else {
        const err = await res.json();
        setLaunchResult({ ok: false, message: err.error ?? '公開に失敗しました' });
      }
    } catch {
      setLaunchResult({ ok: false, message: 'ネットワークエラーが発生しました' });
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        キャラクターが見つかりません
      </div>
    );
  }

  const criticalFailed = data.checks.filter(c => c.critical && !c.passed);
  const optionalFailed = data.checks.filter(c => !c.critical && !c.passed);
  const passed = data.checks.filter(c => c.passed);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div
        className="border-b border-white/8 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(10,5,30,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <Link href="/admin/characters" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
          ← キャラクター一覧
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">ローンチ確認</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* キャラ情報 + スコア */}
        <div className="rounded-2xl border border-white/8 p-6 flex items-center gap-6"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="relative w-[110px] h-[110px] shrink-0">
            <ScoreRing score={data.score} />
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-black text-white">{data.score}</span>
              <span className="text-xs text-gray-400">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              {data.avatarUrl && (
                <img src={data.avatarUrl} alt={data.characterName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{data.characterName}</h1>
                <p className="text-gray-500 text-sm">/{data.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                data.isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}>
                {data.isActive ? '● 公開中' : '○ 非公開'}
              </span>
              <span className="text-xs text-gray-500">
                {passed.length}/{data.checks.length} 項目完了
              </span>
            </div>
          </div>
        </div>

        {/* ローンチ結果 */}
        {launchResult && (
          <div className={`rounded-xl p-4 text-sm font-medium ${
            launchResult.ok
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          }`}>
            {launchResult.message}
          </div>
        )}

        {/* クリティカル未完了 */}
        {criticalFailed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <span>❌</span> 必須項目（要対応）
              <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded-full">{criticalFailed.length}件</span>
            </h2>
            <div className="space-y-2">
              {criticalFailed.map(c => <CheckRow key={c.id} check={c} />)}
            </div>
          </div>
        )}

        {/* オプション未完了 */}
        {optionalFailed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <span>⚠️</span> 推奨項目（未完了）
              <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">{optionalFailed.length}件</span>
            </h2>
            <div className="space-y-2">
              {optionalFailed.map(c => <CheckRow key={c.id} check={c} />)}
            </div>
          </div>
        )}

        {/* 完了済み */}
        {passed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              <span>✅</span> 完了済み
              <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{passed.length}件</span>
            </h2>
            <div className="space-y-2">
              {passed.map(c => <CheckRow key={c.id} check={c} />)}
            </div>
          </div>
        )}

        {/* ローンチボタン */}
        <div className="pt-2">
          {data.isActive ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-center">
              <p className="text-emerald-400 font-bold text-lg">🎉 このキャラクターは公開中です</p>
              <p className="text-gray-500 text-sm mt-1">設定を変更するには各ページから行ってください</p>
            </div>
          ) : data.canLaunch ? (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: launching
                  ? 'rgba(168,85,247,0.4)'
                  : 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                boxShadow: launching ? 'none' : '0 0 30px rgba(168,85,247,0.3)',
              }}
            >
              {launching ? '公開中...' : '🚀 本番公開する'}
            </button>
          ) : (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-4 text-center">
              <p className="text-red-400 font-bold">必須項目を全て完了してから公開できます</p>
              <p className="text-gray-500 text-sm mt-1">残り {criticalFailed.length} 件の必須項目を設定してください</p>
            </div>
          )}
        </div>

        {/* クイックリンク */}
        <div className="border-t border-white/5 pt-6">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">クイックリンク</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: `/admin/characters/${characterId}/bible`, label: '📖 キャラクターバイブル' },
              { href: `/admin/characters/${characterId}/ai-enrich`, label: '🤖 AI深掘り' },
              { href: `/admin/characters/${characterId}/test-chat`, label: '💬 テストチャット' },
              { href: '/admin/gacha', label: '🎲 ガチャ設定' },
              { href: '/admin/stories', label: '📚 ストーリー' },
              { href: '/admin/moments', label: '📸 モーメント' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2.5 rounded-lg border border-white/8 text-gray-300 hover:bg-white/5 hover:text-white transition-all text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
