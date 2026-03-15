'use client';

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface RevenueData {
  monthly: {
    fcRevenue: number;
    coinRevenue: number;
    totalRevenue: number;
    arpu: number;
  };
  activeFcMembers: number;
  revenueByCharacter: {
    characterId: string;
    characterName: string;
    franchise: string;
    fcMembers: number;
    monthlyRevenue: number;
    tenantId: string | null;
  }[];
  revenueByFranchise: { franchise: string; revenue: number }[];
  revenueByTenant: { tenantId: string; name: string; slug: string; revenue: number; fcMembers: number }[];
  dailyTrend: { date: string; coinAmount: number; estimatedRevenue: number }[];
  ipSplit: { ipHolder: number; aniva: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtJpy(n: number) {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`;
  return `¥${n.toLocaleString()}`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  gradientFrom,
  gradientTo,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${gradientFrom}20, transparent 70%)` }}
      />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}30, ${gradientTo}20)`, border: `1px solid ${gradientFrom}30` }}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tight mb-1">{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

// ── Bar Chart (CSS) ────────────────────────────────────────────────────────

function DailyBarChart({ data }: { data: { date: string; estimatedRevenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.estimatedRevenue), 1);
  // Show every 5th label
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d, i) => {
          const pct = (d.estimatedRevenue / max) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className="w-full rounded-t transition-all duration-300 group-hover:opacity-100 opacity-80"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: pct > 60
                    ? 'linear-gradient(to top, #7c3aed, #a855f7)'
                    : pct > 30
                    ? 'linear-gradient(to top, #4f46e5, #7c3aed)'
                    : 'rgba(124,58,237,0.4)',
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.date.slice(5)}<br />{fmtJpy(d.estimatedRevenue)}
              </div>
            </div>
          );
        })}
      </div>
      {/* X axis labels — every 5th */}
      <div className="flex gap-0.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % 5 === 0 && (
              <span className="text-[10px] text-gray-600">{d.date.slice(5)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal Bar (Character Revenue) ────────────────────────────────────

function HorizBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 truncate max-w-[180px]">{label}</span>
        <span className="text-white font-medium tabular-nums ml-2">{fmtJpy(value)}</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #7c3aed, #db2777)',
          }}
        />
      </div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}

// ── Franchise Segment ──────────────────────────────────────────────────────

function FranchiseSegment({ data, total }: { data: { franchise: string; revenue: number }[]; total: number }) {
  const colors = [
    '#7c3aed', '#db2777', '#2563eb', '#059669', '#d97706', '#dc2626',
    '#7c3aed88', '#db277788',
  ];
  return (
    <div className="space-y-3">
      {/* Segment bar */}
      <div className="flex rounded-full overflow-hidden h-4 gap-0.5">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.revenue / total) * 100 : 0;
          if (pct < 0.5) return null;
          return (
            <div
              key={d.franchise}
              title={`${d.franchise}: ${fmtJpy(d.revenue)} (${pct.toFixed(1)}%)`}
              style={{ width: `${pct}%`, background: colors[i % colors.length] }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="space-y-1.5">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.revenue / total) * 100 : 0;
          return (
            <div key={d.franchise} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                <span className="text-gray-400 truncate">{d.franchise}</span>
              </div>
              <div className="flex items-center gap-3 ml-2">
                <span className="text-gray-500">{pct.toFixed(1)}%</span>
                <span className="text-white tabular-nums">{fmtJpy(d.revenue)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: RevenueData) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(12px)',
  };

  const sectionHeader = (title: string, sub?: string) => (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
        データの取得に失敗しました: {error}
      </div>
    );
  }

  const d = data!;
  const ipHolderPayout = Math.round(d.monthly.totalRevenue * (d.ipSplit.ipHolder / 100));
  const anivaPayout = Math.round(d.monthly.totalRevenue * (d.ipSplit.aniva / 100));
  const maxCharRevenue = d.revenueByCharacter[0]?.monthlyRevenue ?? 1;

  return (
    <div className="space-y-8 pb-12" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
          >
            ¥
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">収益ダッシュボード</h1>
            <p className="text-gray-500 text-xs">
              {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })} — リアルタイム集計
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">今月のKPI</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="今月総収益"
            value={fmtJpy(d.monthly.totalRevenue)}
            sub="FC + コイン売上合計"
            gradientFrom="#059669"
            gradientTo="#10b981"
            icon={<svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
          <KpiCard
            label="FC会員数"
            value={fmtNum(d.activeFcMembers)}
            sub="アクティブサブスク"
            gradientFrom="#7c3aed"
            gradientTo="#a855f7"
            icon={<svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>}
          />
          <KpiCard
            label="コイン売上"
            value={fmtJpy(d.monthly.coinRevenue)}
            sub={`今月のPURCHASE換算`}
            gradientFrom="#d97706"
            gradientTo="#f59e0b"
            icon={<svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>}
          />
          <KpiCard
            label="ARPU"
            value={fmtJpy(d.monthly.arpu)}
            sub="会員1人あたり月次収益"
            gradientFrom="#db2777"
            gradientTo="#ec4899"
            icon={<svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>}
          />
        </div>
      </section>

      {/* Revenue Trend + Character Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          {sectionHeader('収益推移（直近30日）', 'コイン購入の推定売上')}
          {d.dailyTrend.length > 0 ? (
            <DailyBarChart data={d.dailyTrend} />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">データなし</div>
          )}
        </section>

        {/* Character Revenue Ranking */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          {sectionHeader('キャラ別収益ランキング', 'FC会員数 × 月額料金')}
          {d.revenueByCharacter.length > 0 ? (
            <div className="space-y-3">
              {d.revenueByCharacter.slice(0, 8).map((ch) => (
                <HorizBar
                  key={ch.characterId}
                  label={ch.characterName}
                  value={ch.monthlyRevenue}
                  max={maxCharRevenue}
                  sub={`FC: ${fmtNum(ch.fcMembers)}人 | ${ch.franchise}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">アクティブなFC会員なし</div>
          )}
        </section>
      </div>

      {/* Franchise + IP Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Franchise Revenue */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          {sectionHeader('フランチャイズ別収益', '作品ごとの収益分布')}
          {d.revenueByFranchise.length > 0 ? (
            <FranchiseSegment data={d.revenueByFranchise} total={d.monthly.fcRevenue} />
          ) : (
            <div className="h-24 flex items-center justify-center text-gray-500 text-sm">データなし</div>
          )}
        </section>

        {/* IP Split + Payment Card */}
        <section className="rounded-2xl p-6 space-y-5" style={cardStyle}>
          {sectionHeader('IP収益配分', 'ANIVAとIPホルダーの分配比率')}

          {/* Split bar */}
          <div>
            <div className="flex rounded-full overflow-hidden h-6 mb-3">
              <div
                className="flex items-center justify-center text-xs font-bold text-white transition-all"
                style={{ width: `${d.ipSplit.ipHolder}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
              >
                IP {d.ipSplit.ipHolder}%
              </div>
              <div
                className="flex items-center justify-center text-xs font-bold text-white transition-all"
                style={{ width: `${d.ipSplit.aniva}%`, background: 'linear-gradient(90deg, #db2777, #ec4899)' }}
              >
                ANIVA {d.ipSplit.aniva}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="text-xs text-violet-400 mb-1">IPホルダー取り分</div>
                <div className="text-xl font-bold text-white tabular-nums">{fmtJpy(ipHolderPayout)}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(219,39,119,0.1)', border: '1px solid rgba(219,39,119,0.2)' }}>
                <div className="text-xs text-pink-400 mb-1">ANIVA取り分</div>
                <div className="text-xl font-bold text-white tabular-nums">{fmtJpy(anivaPayout)}</div>
              </div>
            </div>
          </div>

          {/* Payment estimate card */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.1), rgba(16,185,129,0.05))', border: '1px solid rgba(5,150,105,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
              <span className="text-sm font-semibold text-white">IPホルダーへの支払い見込み</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400 tabular-nums mb-1">{fmtJpy(ipHolderPayout)}</div>
            <div className="text-xs text-gray-500">
              今月末締め / 翌月末払い予定<br />
              総収益 {fmtJpy(d.monthly.totalRevenue)} × {d.ipSplit.ipHolder}%
            </div>
          </div>
        </section>
      </div>

      {/* Tenant Revenue Table */}
      {d.revenueByTenant.length > 0 && (
        <section className="rounded-2xl p-6" style={cardStyle}>
          {sectionHeader('テナント別収益', 'IPホルダーごとの今月実績')}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }} className="text-gray-500 text-xs">
                  <th className="text-left pb-3 pr-4">テナント</th>
                  <th className="text-right pb-3 pr-4">FC会員数</th>
                  <th className="text-right pb-3 pr-4">FC収益</th>
                  <th className="text-right pb-3">支払い見込み (70%)</th>
                </tr>
              </thead>
              <tbody>
                {d.revenueByTenant.map((t) => (
                  <tr key={t.tenantId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <div className="text-white font-medium">{t.name}</div>
                      <div className="text-gray-600 text-xs font-mono">{t.slug}</div>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-300 tabular-nums">{fmtNum(t.fcMembers)}</td>
                    <td className="py-3 pr-4 text-right text-white font-medium tabular-nums">{fmtJpy(t.revenue)}</td>
                    <td className="py-3 text-right text-emerald-400 font-medium tabular-nums">{fmtJpy(Math.round(t.revenue * 0.7))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
