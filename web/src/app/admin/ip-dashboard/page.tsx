'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────

interface CharacterStat {
  id: string;
  name: string;
  franchise: string;
  avatarUrl: string | null;
  fcMembers: number;
  monthlyRevenue: number;
  qualityScore: number; // 0-100
  conversationRate: number; // %
  satisfactionRate: number; // %
  totalFans: number;
  pendingApprovals: number;
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface IpDashboardData {
  tenant: TenantOption;
  characters: CharacterStat[];
  totalRevenue: number;
  totalFcMembers: number;
  payoutEstimate: number;
  pendingApprovals: number;
  recentApprovals: {
    id: string;
    title: string;
    characterName: string;
    status: string;
    type: string;
    createdAt: string;
  }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtJpy(n: number) {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`;
  return `¥${n.toLocaleString()}`;
}

function fmtNum(n: number) { return n.toLocaleString(); }

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{score}</text>
    </svg>
  );
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: '承認待ち', color: 'rgba(245,158,11,0.2)' },
  approved: { label: '承認済み', color: 'rgba(16,185,129,0.2)' },
  rejected: { label: '差し戻し', color: 'rgba(239,68,68,0.2)' },
  revision_requested: { label: '修正依頼', color: 'rgba(168,85,247,0.2)' },
};

// ── Tenant Selector ────────────────────────────────────────────────────────

function TenantSelector({
  tenants,
  selected,
  onChange,
}: {
  tenants: TenantOption[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {tenants.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
          style={
            selected === t.id
              ? { background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: 'white' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
          }
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

// ── Character Card ─────────────────────────────────────────────────────────

function CharCard({ ch }: { ch: CharacterStat }) {
  const scoreColor =
    ch.qualityScore >= 80 ? '#10b981' :
    ch.qualityScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="rounded-2xl p-5 space-y-4 transition-all duration-300 hover:scale-[1.01]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))' }}
        >
          {ch.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ch.avatarUrl} alt={ch.name} className="w-full h-full object-cover" />
          ) : (
            ch.name[0]
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{ch.name}</div>
          <div className="text-gray-500 text-xs truncate">{ch.franchise}</div>
          {ch.pendingApprovals > 0 && (
            <div className="mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                監修待ち {ch.pendingApprovals}件
              </span>
            </div>
          )}
        </div>
        <ScoreRing score={ch.qualityScore} color={scoreColor} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <div className="text-[10px] text-violet-400 uppercase tracking-wider mb-1">FC会員</div>
          <div className="text-xl font-bold text-white tabular-nums">{fmtNum(ch.fcMembers)}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">月収益</div>
          <div className="text-xl font-bold text-white tabular-nums">{fmtJpy(ch.monthlyRevenue)}</div>
        </div>
      </div>

      {/* Quality metrics */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">応答満足度</span>
            <span className="text-white font-medium">{ch.satisfactionRate}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${ch.satisfactionRate}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">会話継続率</span>
            <span className="text-white font-medium">{ch.conversationRate}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${ch.conversationRate}%`, background: 'linear-gradient(90deg, #db2777, #ec4899)' }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/admin/characters/${ch.id}`}
          className="flex-1 text-center py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-90"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}
        >
          キャラ詳細
        </Link>
        <Link
          href={`/admin/approvals`}
          className="flex-1 text-center py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-90"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}
        >
          監修キュー
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function IpDashboardPage() {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [dashData, setDashData] = useState<IpDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Fetch tenants list
  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((d) => {
        const list: TenantOption[] = (d.tenants ?? []).map((t: { id: string; name: string; slug: string }) => ({
          id: t.id, name: t.name, slug: t.slug,
        }));
        setTenants(list);
        if (list.length > 0) setSelectedTenantId(list[0].id);
      })
      .catch(console.error)
      .finally(() => setTenantsLoading(false));
  }, []);

  // Fetch dashboard data for selected tenant
  useEffect(() => {
    if (!selectedTenantId) return;
    setLoading(true);
    setDashData(null);

    // Fetch revenue + approvals in parallel
    Promise.all([
      fetch('/api/admin/revenue').then((r) => r.json()),
      fetch(`/api/admin/approvals?status=pending`).then((r) => r.json()),
      fetch(`/api/admin/approvals?status=approved&limit=5`).then((r) => r.json()),
      fetch(`/api/admin/tenants/${selectedTenantId}/characters`).then((r) => r.ok ? r.json() : { characters: [] }),
    ])
      .then(([revenue, pendingApprovals, recentApprovals, tenantChars]) => {
        const tenant = tenants.find((t) => t.id === selectedTenantId);
        if (!tenant) return;

        // Characters for this tenant
        const tenantCharIds = new Set<string>(
          (tenantChars.characters ?? []).map((c: { id: string }) => c.id)
        );

        // Map revenue data for this tenant's characters
        const revByChar = new Map<string, { fcMembers: number; monthlyRevenue: number }>();
        for (const ch of revenue.revenueByCharacter ?? []) {
          if (ch.tenantId === selectedTenantId) {
            revByChar.set(ch.characterId, {
              fcMembers: ch.fcMembers,
              monthlyRevenue: ch.monthlyRevenue,
            });
          }
        }

        // Pending approvals per character
        const pendingByChar = new Map<string, number>();
        for (const a of pendingApprovals.approvals ?? []) {
          if (tenantCharIds.has(a.characterId)) {
            pendingByChar.set(a.characterId, (pendingByChar.get(a.characterId) ?? 0) + 1);
          }
        }

        // Build character stats
        const characters: CharacterStat[] = (tenantChars.characters ?? []).map((c: {
          id: string; name: string; franchise: string; avatarUrl?: string;
          fcSubscriberCount?: number;
        }) => {
          const rev = revByChar.get(c.id) ?? { fcMembers: c.fcSubscriberCount ?? 0, monthlyRevenue: 0 };
          // Mock quality scores (would be derived from real analytics in production)
          const seed = c.id.charCodeAt(0) + c.id.charCodeAt(1);
          const satisfactionRate = 60 + (seed % 35);
          const conversationRate = 55 + ((seed * 3) % 40);
          const qualityScore = Math.round((satisfactionRate + conversationRate) / 2);
          return {
            id: c.id,
            name: c.name,
            franchise: c.franchise,
            avatarUrl: c.avatarUrl ?? null,
            fcMembers: rev.fcMembers,
            monthlyRevenue: rev.monthlyRevenue,
            qualityScore,
            satisfactionRate,
            conversationRate,
            totalFans: rev.fcMembers,
            pendingApprovals: pendingByChar.get(c.id) ?? 0,
          };
        });

        const totalRevenue = characters.reduce((s, c) => s + c.monthlyRevenue, 0);
        const totalFcMembers = characters.reduce((s, c) => s + c.fcMembers, 0);

        setDashData({
          tenant,
          characters,
          totalRevenue,
          totalFcMembers,
          payoutEstimate: Math.round(totalRevenue * 0.7),
          pendingApprovals: (pendingApprovals.approvals ?? []).filter(
            (a: { characterId: string }) => tenantCharIds.has(a.characterId)
          ).length,
          recentApprovals: [
            ...(pendingApprovals.approvals ?? [])
              .filter((a: { characterId: string }) => tenantCharIds.has(a.characterId))
              .slice(0, 3),
            ...(recentApprovals.approvals ?? [])
              .filter((a: { characterId: string }) => tenantCharIds.has(a.characterId))
              .slice(0, 3),
          ].slice(0, 5).map((a: {
            id: string; title: string;
            character?: { name: string }; status: string; type: string; createdAt: string;
          }) => ({
            id: a.id,
            title: a.title,
            characterName: a.character?.name ?? '不明',
            status: a.status,
            type: a.type,
            createdAt: a.createdAt,
          })),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' };

  return (
    <div className="space-y-8 pb-12" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
          >
            IP
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">IPホルダー ダッシュボード</h1>
            <p className="text-gray-500 text-xs">テナント別キャラクターパフォーマンス</p>
          </div>
        </div>
      </div>

      {/* Tenant Selector */}
      {tenantsLoading ? (
        <div className="text-gray-500 text-sm">テナント一覧を読み込み中...</div>
      ) : tenants.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={cardStyle}>
          <p className="text-gray-500">テナントが登録されていません</p>
          <Link href="/admin/tenants" className="text-violet-400 text-sm mt-2 inline-block hover:underline">
            テナント管理 →
          </Link>
        </div>
      ) : (
        <TenantSelector tenants={tenants} selected={selectedTenantId} onChange={setSelectedTenantId} />
      )}

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            読み込み中...
          </div>
        </div>
      )}

      {dashData && !loading && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'キャラ数', value: fmtNum(dashData.characters.length), color: '#7c3aed', icon: '👾' },
              { label: 'FC会員数', value: fmtNum(dashData.totalFcMembers), color: '#a855f7', icon: '👥' },
              { label: '今月収益', value: fmtJpy(dashData.totalRevenue), color: '#10b981', icon: '💴' },
              { label: '支払い見込み', value: fmtJpy(dashData.payoutEstimate), color: '#f59e0b', icon: '💳' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl p-5" style={cardStyle}>
                <div className="text-xl mb-2">{kpi.icon}</div>
                <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: 'white' }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Characters Grid */}
          {dashData.characters.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">キャラクター一覧</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <span className="text-xs text-gray-600">{dashData.characters.length}体</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dashData.characters.map((ch) => (
                  <CharCard key={ch.id} ch={ch} />
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl p-8 text-center" style={cardStyle}>
              <p className="text-gray-500">このテナントにキャラクターがありません</p>
              <Link href="/admin/characters" className="text-violet-400 text-sm mt-2 inline-block hover:underline">
                キャラクター管理 →
              </Link>
            </div>
          )}

          {/* Approval Queue */}
          <section className="rounded-2xl p-6" style={cardStyle}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white">コンテンツ監修キュー</h2>
                <p className="text-xs text-gray-500 mt-0.5">このIPホルダーのキャラに関連する承認リクエスト</p>
              </div>
              {dashData.pendingApprovals > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300">{dashData.pendingApprovals}件待ち</span>
                </div>
              )}
              <Link
                href="/admin/approvals"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors ml-4"
              >
                全件表示 →
              </Link>
            </div>

            {dashData.recentApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                <svg className="w-8 h-8 mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                監修待ちのコンテンツはありません
              </div>
            ) : (
              <div className="space-y-2">
                {dashData.recentApprovals.map((a) => {
                  const badge = STATUS_BADGE[a.status] ?? { label: a.status, color: 'rgba(255,255,255,0.08)' };
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{a.characterName}: {a.title}</div>
                        <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString('ja-JP')}</div>
                      </div>
                      <div
                        className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ background: badge.color, color: 'white' }}
                      >
                        {badge.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
