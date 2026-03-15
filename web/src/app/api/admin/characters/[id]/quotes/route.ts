import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const quotes = await prisma.characterQuote.findMany({
    where: { characterId: id },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const data = await req.json();

  // バルク作成対応
  if (Array.isArray(data)) {
    const quotes = await prisma.characterQuote.createMany({
      data: data.map((q: Record<string, unknown>) => ({
        characterId: id,
        quote: q.quote as string,
        context: (q.context as string) || null,
        emotion: (q.emotion as string) || null,
        episode: (q.episode as string) || null,
        category: (q.category as string) || 'general',
        importance: (q.importance as number) || 5,
        locale: (q.locale as string) || 'ja',
      })),
    });
    return NextResponse.json({ created: quotes.count });
  }

  const quote = await prisma.characterQuote.create({
    data: {
      characterId: id,
      quote: data.quote,
      context: data.context || null,
      emotion: data.emotion || null,
      episode: data.episode || null,
      category: data.category || 'general',
      importance: data.importance || 5,
      locale: data.locale || 'ja',
    },
  });
  return NextResponse.json(quote);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { quoteId } = await req.json();

  if (quoteId) {
    await prisma.characterQuote.delete({ where: { id: quoteId } });
  } else {
    // 全削除
    await prisma.characterQuote.deleteMany({ where: { characterId: id } });
  }
  return NextResponse.json({ ok: true });
}
