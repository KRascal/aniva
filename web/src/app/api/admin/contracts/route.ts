/**
 * GET  /api/admin/contracts  — 契約一覧
 * POST /api/admin/contracts  — 新規契約作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contracts = await prisma.contract.findMany({
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const result = contracts.map((c) => ({
    ...c,
    isExpiringSoon: c.endDate.getTime() - now.getTime() < c.renewalAlertDays * 86400000,
    daysUntilExpiry: Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000),
  }));

  return NextResponse.json({ contracts: result });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      tenantId, contractCode, rightsHolder, targetWork, targetCharacters,
      status, allowedRegions, allowedLanguages, startDate, endDate,
      renewalAlertDays, voiceAllowed, snsAllowed, adAllowed, aiTrainingAllowed,
      ragAllowed, thirdPartyAllowed, ugcAllowed, revenueSharePercent,
      minimumGuarantee, reportingCycle, supervisorName, supervisorEmail,
      supervisorPhone, contractDocUrl, notes,
    } = body;

    if (!tenantId || !contractCode || !rightsHolder || !targetWork || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const contract = await prisma.contract.create({
      data: {
        tenantId,
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
        contractDocUrl: contractDocUrl ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) {
    console.error('[admin/contracts POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
