import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // 30日前
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // ── FC会員数（active） ──────────────────────────────────
    const activeFcMembers = await prisma.characterSubscription.count({
      where: { status: 'ACTIVE' },
    });

    // ── FC収益（active件数 × fcMonthlyPriceJpy） ───────────
    // キャラ別にまとめてから × 単価
    const fcSubsByChar = await prisma.characterSubscription.groupBy({
      by: ['characterId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    });

    const charIds = fcSubsByChar.map((r) => r.characterId);
    const characters = charIds.length > 0
      ? await prisma.character.findMany({
          where: { id: { in: charIds } },
          select: {
            id: true,
            name: true,
            franchise: true,
            fcMonthlyPriceJpy: true,
            tenantId: true,
            avatarUrl: true,
          },
        })
      : [];

    const charMap = new Map(characters.map((c) => [c.id, c]));

    let fcRevenue = 0;
    const revenueByCharacter: {
      characterId: string;
      characterName: string;
      franchise: string;
      fcMembers: number;
      monthlyRevenue: number;
      tenantId: string | null;
    }[] = [];

    for (const row of fcSubsByChar) {
      const ch = charMap.get(row.characterId);
      if (!ch) continue;
      const rev = row._count._all * ch.fcMonthlyPriceJpy;
      fcRevenue += rev;
      revenueByCharacter.push({
        characterId: ch.id,
        characterName: ch.name,
        franchise: ch.franchise,
        fcMembers: row._count._all,
        monthlyRevenue: rev,
        tenantId: ch.tenantId ?? null,
      });
    }
    revenueByCharacter.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

    // ── コイン購入売上（今月） ──────────────────────────────
    const coinResult = await prisma.coinTransaction.aggregate({
      where: {
        type: 'PURCHASE',
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    });
    // CoinTransaction.amount はコイン数なので、コイン単価を ¥1.1 として換算
    // （実際には Transaction テーブルの方が正確だが、簡易集計として）
    const coinCount = coinResult._sum.amount ?? 0;
    const coinRevenue = Math.round(coinCount * 1.1); // 近似値

    // ── フランチャイズ別収益 ────────────────────────────────
    const franchiseMap = new Map<string, number>();
    for (const row of revenueByCharacter) {
      const f = row.franchise || '未分類';
      franchiseMap.set(f, (franchiseMap.get(f) ?? 0) + row.monthlyRevenue);
    }
    const revenueByFranchise = Array.from(franchiseMap.entries())
      .map(([franchise, revenue]) => ({ franchise, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── 日別推移（直近30日のCOIN購入） ─────────────────────
    const dailyCoinRows = await prisma.coinTransaction.groupBy({
      by: ['createdAt'],
      where: {
        type: 'PURCHASE',
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    // 日付ごとに集計
    const dailyMap = new Map<string, number>();
    for (const row of dailyCoinRows) {
      const dateStr = row.createdAt.toISOString().slice(0, 10);
      dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + (row._sum.amount ?? 0));
    }

    // 直近30日分を埋める
    const dailyTrend: { date: string; coinAmount: number; estimatedRevenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const coins = dailyMap.get(dateStr) ?? 0;
      dailyTrend.push({
        date: dateStr,
        coinAmount: coins,
        estimatedRevenue: Math.round(coins * 1.1),
      });
    }

    const totalRevenue = fcRevenue + coinRevenue;
    const arpu = activeFcMembers > 0 ? Math.round(totalRevenue / activeFcMembers) : 0;

    // ── テナント別収益 ──────────────────────────────────────
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, slug: true },
    });
    const tenantRevenueMap = new Map<string, { name: string; slug: string; revenue: number; fcMembers: number }>();
    for (const t of tenants) {
      tenantRevenueMap.set(t.id, { name: t.name, slug: t.slug, revenue: 0, fcMembers: 0 });
    }
    for (const row of revenueByCharacter) {
      if (row.tenantId && tenantRevenueMap.has(row.tenantId)) {
        const t = tenantRevenueMap.get(row.tenantId)!;
        t.revenue += row.monthlyRevenue;
        t.fcMembers += row.fcMembers;
      }
    }
    const revenueByTenant = Array.from(tenantRevenueMap.entries())
      .map(([tenantId, data]) => ({ tenantId, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      monthly: {
        fcRevenue,
        coinRevenue,
        totalRevenue,
        arpu,
      },
      activeFcMembers,
      revenueByCharacter,
      revenueByFranchise,
      revenueByTenant,
      dailyTrend,
      ipSplit: { ipHolder: 70, aniva: 30 },
    });
  } catch (error) {
    console.error('[/api/admin/revenue] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
