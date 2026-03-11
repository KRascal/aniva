import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { plan } = await req.json();

  if (!['FREE', 'STANDARD', 'PREMIUM'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { plan },
    select: { id: true, email: true, plan: true },
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.USER_PLAN_CHANGE, admin.email, {
    userId: id, plan,
  });

  return NextResponse.json(user);
}
