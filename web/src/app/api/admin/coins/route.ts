import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [packages, total] = await prisma.$transaction([
      prisma.coinPackage.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.coinPackage.count(),
    ]);

    return NextResponse.json({ packages, total });
  } catch (error) {
    console.error('[GET /api/admin/coins]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      name,
      coinAmount,
      priceWebJpy,
      priceStoreJpy,
      stripePriceId,
      isActive = true,
      sortOrder = 0,
    } = body;

    if (!name || coinAmount === undefined || priceWebJpy === undefined || priceStoreJpy === undefined) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const pkg = await prisma.coinPackage.create({
      data: {
        name,
        coinAmount: Number(coinAmount),
        priceWebJpy: Number(priceWebJpy),
        priceStoreJpy: Number(priceStoreJpy),
        stripePriceId: stripePriceId || null,
        isActive,
        sortOrder: Number(sortOrder),
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.COIN_PACKAGE_CREATE, admin.email, {
      packageId: pkg.id, name, coinAmount: Number(coinAmount),
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/coins]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const pkg = await prisma.coinPackage.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.coinAmount !== undefined && { coinAmount: Number(data.coinAmount) }),
        ...(data.priceWebJpy !== undefined && { priceWebJpy: Number(data.priceWebJpy) }),
        ...(data.priceStoreJpy !== undefined && { priceStoreJpy: Number(data.priceStoreJpy) }),
        ...(data.stripePriceId !== undefined && { stripePriceId: data.stripePriceId || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: Number(data.sortOrder) }),
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.COIN_PACKAGE_UPDATE, admin.email, {
      packageId: id,
    });

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error('[PUT /api/admin/coins]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.coinPackage.delete({ where: { id } });

    await adminAudit(ADMIN_AUDIT_ACTIONS.COIN_PACKAGE_DELETE, admin.email, {
      packageId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/admin/coins]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
