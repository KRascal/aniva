import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const boundaries = await prisma.characterBoundary.findMany({
    where: { characterId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(boundaries);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const data = await req.json();

  if (Array.isArray(data)) {
    const result = await prisma.characterBoundary.createMany({
      data: data.map((b: Record<string, unknown>) => ({
        characterId: id,
        rule: b.rule as string,
        category: (b.category as string) || 'speech',
        severity: (b.severity as string) || 'hard',
        example: (b.example as string) || null,
        reason: (b.reason as string) || null,
      })),
    });
    await adminAudit(ADMIN_AUDIT_ACTIONS.CHARACTER_BOUNDARY_UPDATE, admin.email, {
      characterId: id, batchCount: result.count,
    });

    return NextResponse.json({ created: result.count });
  }

  const boundary = await prisma.characterBoundary.create({
    data: {
      characterId: id,
      rule: data.rule,
      category: data.category || 'speech',
      severity: data.severity || 'hard',
      example: data.example || null,
      reason: data.reason || null,
    },
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.CHARACTER_BOUNDARY_UPDATE, admin.email, {
    characterId: id, boundaryId: boundary.id,
  });

  return NextResponse.json(boundary);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { boundaryId } = await req.json();

  if (boundaryId) {
    await prisma.characterBoundary.delete({ where: { id: boundaryId } });
  } else {
    await prisma.characterBoundary.deleteMany({ where: { characterId: id } });
  }
  return NextResponse.json({ ok: true });
}
