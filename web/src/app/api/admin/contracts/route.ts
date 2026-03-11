import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, tenantScope } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/contracts — 契約一覧
export async function GET(req: NextRequest) {
  const ctx = await requireRole('viewer');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const contracts = await prisma.contract.findMany({
    where: {
      ...tenantScope(ctx),
      ...(status ? { status } : {}),
    },
    include: {
      tenant: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 期限切れアラート情報を追加
  const now = new Date();
  const enriched = contracts.map((c) => {
    const daysUntilExpiry = Math.ceil(
      (c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...c,
      daysUntilExpiry,
      isExpiringSoon: daysUntilExpiry <= c.renewalAlertDays && daysUntilExpiry > 0,
      isExpired: daysUntilExpiry <= 0,
    };
  });

  return NextResponse.json(enriched);
}

// POST /api/admin/contracts — 契約新規作成
export async function POST(req: NextRequest) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    tenantId, contractCode, rightsHolder, targetWork, targetCharacters,
    status, allowedRegions, allowedLanguages, startDate, endDate,
    renewalAlertDays, voiceAllowed, snsAllowed, adAllowed,
    aiTrainingAllowed, ragAllowed, thirdPartyAllowed, ugcAllowed,
    revenueSharePercent, minimumGuarantee, reportingCycle,
    supervisorName, supervisorEmail, supervisorPhone,
    allowedAssets, prohibitedAssets, contractDocUrl, notes,
  } = body;

  if (!contractCode || !rightsHolder || !targetWork || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'contractCode, rightsHolder, targetWork, startDate, endDate are required' },
      { status: 400 }
    );
  }

  // super_adminでない場合は自テナントにのみ作成可
  const effectiveTenantId = ctx.role === 'super_admin' ? tenantId : ctx.tenantId;
  if (!effectiveTenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const contract = await prisma.contract.create({
    data: {
      tenantId: effectiveTenantId,
      contractCode,
      rightsHolder,
      targetWork,
      targetCharacters: targetCharacters ?? [],
      status: status ?? 'negotiating',
      allowedRegions: allowedRegions ?? [],
      allowedLanguages: allowedLanguages ?? [],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      renewalAlertDays: renewalAlertDays ?? 90,
      voiceAllowed: voiceAllowed ?? false,
      snsAllowed: snsAllowed ?? false,
      adAllowed: adAllowed ?? false,
      aiTrainingAllowed: aiTrainingAllowed ?? false,
      ragAllowed: ragAllowed ?? false,
      thirdPartyAllowed: thirdPartyAllowed ?? false,
      ugcAllowed: ugcAllowed ?? false,
      revenueSharePercent: revenueSharePercent ?? null,
      minimumGuarantee: minimumGuarantee ?? null,
      reportingCycle: reportingCycle ?? 'monthly',
      supervisorName: supervisorName ?? null,
      supervisorEmail: supervisorEmail ?? null,
      supervisorPhone: supervisorPhone ?? null,
      allowedAssets: allowedAssets ?? [],
      prohibitedAssets: prohibitedAssets ?? [],
      contractDocUrl: contractDocUrl ?? null,
      notes: notes ?? null,
    },
  });

  await adminAudit('contract_create', ctx.email, {
    contractId: contract.id, contractCode, rightsHolder, targetWork,
  });

  return NextResponse.json(contract, { status: 201 });
}
