import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, canAccessCharacter } from '@/lib/rbac';
import { adminAudit } from '@/lib/audit-log';

// GET /api/admin/contracts/[id] — 契約詳細
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('viewer');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { tenant: { select: { name: true, slug: true } } },
  });

  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // テナントスコープチェック
  if (ctx.role !== 'super_admin' && contract.tenantId !== ctx.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(contract);
}

// PUT /api/admin/contracts/[id] — 契約更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // テナントスコープチェック
  if (ctx.role !== 'super_admin' && contract.tenantId !== ctx.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      ...(body.contractCode !== undefined && { contractCode: body.contractCode }),
      ...(body.rightsHolder !== undefined && { rightsHolder: body.rightsHolder }),
      ...(body.targetWork !== undefined && { targetWork: body.targetWork }),
      ...(body.targetCharacters !== undefined && { targetCharacters: body.targetCharacters }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.allowedRegions !== undefined && { allowedRegions: body.allowedRegions }),
      ...(body.allowedLanguages !== undefined && { allowedLanguages: body.allowedLanguages }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
      ...(body.renewalAlertDays !== undefined && { renewalAlertDays: body.renewalAlertDays }),
      ...(body.voiceAllowed !== undefined && { voiceAllowed: body.voiceAllowed }),
      ...(body.snsAllowed !== undefined && { snsAllowed: body.snsAllowed }),
      ...(body.adAllowed !== undefined && { adAllowed: body.adAllowed }),
      ...(body.aiTrainingAllowed !== undefined && { aiTrainingAllowed: body.aiTrainingAllowed }),
      ...(body.ragAllowed !== undefined && { ragAllowed: body.ragAllowed }),
      ...(body.thirdPartyAllowed !== undefined && { thirdPartyAllowed: body.thirdPartyAllowed }),
      ...(body.ugcAllowed !== undefined && { ugcAllowed: body.ugcAllowed }),
      ...(body.revenueSharePercent !== undefined && { revenueSharePercent: body.revenueSharePercent }),
      ...(body.minimumGuarantee !== undefined && { minimumGuarantee: body.minimumGuarantee }),
      ...(body.reportingCycle !== undefined && { reportingCycle: body.reportingCycle }),
      ...(body.supervisorName !== undefined && { supervisorName: body.supervisorName }),
      ...(body.supervisorEmail !== undefined && { supervisorEmail: body.supervisorEmail }),
      ...(body.supervisorPhone !== undefined && { supervisorPhone: body.supervisorPhone }),
      ...(body.allowedAssets !== undefined && { allowedAssets: body.allowedAssets }),
      ...(body.prohibitedAssets !== undefined && { prohibitedAssets: body.prohibitedAssets }),
      ...(body.contractDocUrl !== undefined && { contractDocUrl: body.contractDocUrl }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  await adminAudit('contract_update', ctx.email, {
    contractId: id, contractCode: contract.contractCode, changes: Object.keys(body),
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/contracts/[id] — 契約削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('super_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.contract.delete({ where: { id } });
  await adminAudit('contract_delete', ctx.email, {
    contractId: id, contractCode: contract.contractCode,
  });

  return NextResponse.json({ ok: true });
}
