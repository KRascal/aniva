import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { seedOnePieceLore } from '@/lib/lore-engine';

// GET: Lore一覧 (フランチャイズ別)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const franchiseId = searchParams.get('franchiseId');
  const category = searchParams.get('category');

  const [franchises, entries] = await Promise.all([
    prisma.loreFranchise.findMany({ orderBy: { name: 'asc' } }),
    prisma.loreEntry.findMany({
      where: {
        ...(franchiseId ? { franchiseId } : {}),
        ...(category ? { category } : {}),
      },
      include: { franchise: { select: { name: true } } },
      orderBy: [{ importance: 'desc' }, { title: 'asc' }],
    }),
  ]);

  return NextResponse.json({ franchises, entries });
}

// POST: Loreエントリ作成 or シード投入
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await req.json();

  // シードモード
  if (data.action === 'seed_one_piece') {
    const result = await seedOnePieceLore();
    return NextResponse.json(result);
  }

  // 単発作成
  const entry = await prisma.loreEntry.create({
    data: {
      franchiseId: data.franchiseId,
      title: data.title,
      content: data.content,
      category: data.category || 'event',
      keywords: data.keywords || [],
      importance: data.importance || 5,
      spoilerLevel: data.spoilerLevel || 0,
    },
  });
  return NextResponse.json(entry);
}

// PUT: Loreエントリ更新
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await req.json();
  const entry = await prisma.loreEntry.update({
    where: { id: data.id },
    data: {
      title: data.title,
      content: data.content,
      category: data.category,
      keywords: data.keywords,
      importance: data.importance,
      spoilerLevel: data.spoilerLevel,
    },
  });
  return NextResponse.json(entry);
}

// DELETE: Loreエントリ削除
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  await prisma.loreEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
