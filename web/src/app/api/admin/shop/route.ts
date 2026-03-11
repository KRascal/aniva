import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

// GET: 商品一覧（管理者用・全件、非アクティブ含む）
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get('characterId');
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    // 単一商品取得
    if (id) {
      const item = await prisma.shopItem.findUnique({
        where: { id },
        include: {
          character: { select: { id: true, name: true, avatarUrl: true } },
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { user: { select: { id: true, email: true, displayName: true } } },
          },
        },
      });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ item });
    }

    const where: Record<string, unknown> = {};
    if (characterId) where.characterId = characterId;
    if (type) where.type = type;

    const [items, total] = await prisma.$transaction([
      prisma.shopItem.findMany({
        where,
        include: {
          character: { select: { id: true, name: true, avatarUrl: true, slug: true } },
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shopItem.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('[GET /api/admin/shop]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: 商品追加
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { characterId, name, description, type, priceCoins, priceJpy, imageUrl, fileUrl, stock, isActive } = body;

    if (!characterId || !name || !type || priceCoins === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: characterId, name, type, priceCoins' },
        { status: 400 }
      );
    }

    const item = await prisma.shopItem.create({
      data: {
        characterId,
        name,
        description: description ?? null,
        type,
        priceCoins: Number(priceCoins),
        priceJpy: priceJpy !== undefined && priceJpy !== null ? Number(priceJpy) : null,
        imageUrl: imageUrl ?? null,
        fileUrl: fileUrl ?? null,
        stock: stock !== undefined && stock !== null ? Number(stock) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        character: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.SHOP_ITEM_CREATE, admin.email, {
      itemId: item.id, name, characterId, type,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/shop]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: 商品更新
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { id, characterId, name, description, type, priceCoins, priceJpy, imageUrl, fileUrl, stock, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.shopItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (characterId !== undefined) updateData.characterId = characterId;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (priceCoins !== undefined) updateData.priceCoins = Number(priceCoins);
    if (priceJpy !== undefined) updateData.priceJpy = priceJpy !== null ? Number(priceJpy) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (stock !== undefined) updateData.stock = stock !== null ? Number(stock) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const item = await prisma.shopItem.update({
      where: { id },
      data: updateData,
      include: {
        character: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.SHOP_ITEM_UPDATE, admin.email, {
      itemId: id,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[PUT /api/admin/shop]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: 商品削除（論理削除: isActive=false）
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.shopItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // 論理削除（注文履歴を保持するため）
    const item = await prisma.shopItem.update({
      where: { id },
      data: { isActive: false },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.SHOP_ITEM_DELETE, admin.email, {
      itemId: id, name: existing.name,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[DELETE /api/admin/shop]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
