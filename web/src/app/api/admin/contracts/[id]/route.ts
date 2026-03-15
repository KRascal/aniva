/**
 * PUT    /api/admin/contracts/[id]  — 契約更新
 * DELETE /api/admin/contracts/[id]  — 契約削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const {
      contractCode, rightsHolder, targetWork, targetCharacters, status,
      allowedRegions, allowedLanguages, startDate, endDate, renewalAlertDays,
      voiceAllowed, snsAllowed, adAllowed, aiTrainingAllowed, ragAllowed,
      thirdPartyAllowed, ugcAllowed, revenueSharePercent, minimumGuarantee,
      reportingCycle, supervisorName, supervisorEmail, supervisorPhone,
      contractDocUrl, notes,
    } = body;

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        ...(contractCode !== undefined && { contractCode }),
        ...(rightsHolder !== undefined && { rightsHolder }),
        ...(targetWork !== undefined && { targetWork }),
        ...(targetCharacters !== undefined && { targetCharacters }),
        ...(status !== undefined && { status }),
        ...(allowedRegions !== undefined && { allowedRegions }),
        ...(allowedLanguages !== undefined && { allowedLanguages }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(renewalAlertDays !== undefined && { renewalAlertDays }),
        ...(voiceAllowed !== undefined && { voiceAllowed }),
        ...(snsAllowed !== undefined && { snsAllowed }),
        ...(adAllowed !== undefined && { adAllowed }),
        ...(aiTrainingAllowed !== undefined && { aiTrainingAllowed }),
        ...(ragAllowed !== undefined && { ragAllowed }),
        ...(thirdPartyAllowed !== undefined && { thirdPartyAllowed }),
        ...(ugcAllowed !== undefined && { ugcAllowed }),
        ...(revenueSharePercent !== undefined && { revenueSharePercent }),
        ...(minimumGuarantee !== undefined && { minimumGuarantee }),
        ...(reportingCycle !== undefined && { reportingCycle }),
        ...(supervisorName !== undefined && { supervisorName }),
        ...(supervisorEmail !== undefined && { supervisorEmail }),
        ...(supervisorPhone !== undefined && { supervisorPhone }),
        ...(contractDocUrl !== undefined && { contractDocUrl }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ contract: updated });
  } catch (err) {
    logger.error('[admin/contracts PUT]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('[admin/contracts DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
