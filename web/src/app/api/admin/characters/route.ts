import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const characters = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      franchise: true,
      franchiseEn: true,
      description: true,
      systemPrompt: true,
      voiceModelId: true,
      catchphrases: true,
      personalityTraits: true,
      avatarUrl: true,
      coverUrl: true,
      isActive: true,
      monthlyPrice: true,
      callPricePerMin: true,
      chatPricePerMsg: true,
      freeMessageLimit: true,
      freeCallMinutes: true,
      createdAt: true,
      _count: { select: { relationships: true } },
      relationships: { select: { totalMessages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    characters.map((c: { id: string; name: string; relationships: { totalMessages: number }[]; [key: string]: unknown }) => ({
      ...c,
      messageCount: c.relationships.reduce((s: number, r: { totalMessages: number }) => s + r.totalMessages, 0),
      relationships: undefined,
    }))
  );
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    name, nameEn, slug, franchise, franchiseEn, description,
    systemPrompt, voiceModelId, catchphrases, personalityTraits,
    avatarUrl, coverUrl, isActive,
    monthlyPrice, callPricePerMin, chatPricePerMsg,
    freeMessageLimit, freeCallMinutes,
  } = body;

  if (!name || !slug || !franchise || !systemPrompt) {
    return NextResponse.json({ error: 'name, slug, franchise, systemPrompt are required' }, { status: 400 });
  }

  const toPrice = (v: unknown) => {
    const n = parseInt(String(v ?? 0), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const character = await prisma.character.create({
    data: {
      name,
      nameEn: nameEn || null,
      slug,
      franchise,
      franchiseEn: franchiseEn || null,
      description: description || null,
      systemPrompt,
      voiceModelId: voiceModelId || null,
      catchphrases: Array.isArray(catchphrases) ? catchphrases : [],
      personalityTraits: personalityTraits || [],
      avatarUrl: avatarUrl || null,
      coverUrl: coverUrl || null,
      isActive: isActive !== undefined ? isActive : true,
      monthlyPrice: toPrice(monthlyPrice),
      callPricePerMin: toPrice(callPricePerMin),
      chatPricePerMsg: toPrice(chatPricePerMsg),
      freeMessageLimit: freeMessageLimit !== undefined ? toPrice(freeMessageLimit) : 5,
      freeCallMinutes: freeCallMinutes !== undefined ? toPrice(freeCallMinutes) : 3,
    },
  });

  return NextResponse.json(character, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const {
    name, nameEn, slug, franchise, franchiseEn, description,
    systemPrompt, voiceModelId, catchphrases, personalityTraits,
    avatarUrl, coverUrl, isActive,
    monthlyPrice, callPricePerMin, chatPricePerMsg,
    freeMessageLimit, freeCallMinutes,
  } = data;

  const toPrice = (v: unknown) => {
    const n = parseInt(String(v ?? 0), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const character = await prisma.character.update({
    where: { id },
    data: {
      name, nameEn, slug, franchise, franchiseEn, description,
      systemPrompt, voiceModelId,
      catchphrases: Array.isArray(catchphrases) ? catchphrases : undefined,
      personalityTraits: personalityTraits !== undefined ? personalityTraits : undefined,
      avatarUrl, coverUrl, isActive,
      monthlyPrice: monthlyPrice !== undefined ? toPrice(monthlyPrice) : undefined,
      callPricePerMin: callPricePerMin !== undefined ? toPrice(callPricePerMin) : undefined,
      chatPricePerMsg: chatPricePerMsg !== undefined ? toPrice(chatPricePerMsg) : undefined,
      freeMessageLimit: freeMessageLimit !== undefined ? toPrice(freeMessageLimit) : undefined,
      freeCallMinutes: freeCallMinutes !== undefined ? toPrice(freeCallMinutes) : undefined,
    },
  });

  return NextResponse.json(character);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.character.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
