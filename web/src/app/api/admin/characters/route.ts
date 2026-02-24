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
      fcMonthlyPriceJpy: true,
      fcIncludedCallMin: true,
      callCoinPerMin: true,
      fcOverageCallCoinPerMin: true,
      freeMessageLimit: true,
      freeCallMinutes: true,
      stripeProductId: true,
      fcSubscriberCount: true,
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
    fcMonthlyPriceJpy, fcIncludedCallMin, callCoinPerMin, fcOverageCallCoinPerMin,
    freeMessageLimit, freeCallMinutes,
  } = body;

  if (!name || !slug || !franchise || !systemPrompt) {
    return NextResponse.json({ error: 'name, slug, franchise, systemPrompt are required' }, { status: 400 });
  }

  const toInt = (v: unknown, fallback = 0) => {
    const n = parseInt(String(v ?? fallback), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  // Validation
  const fcPrice = toInt(fcMonthlyPriceJpy, 3480);
  const callCoin = toInt(callCoinPerMin, 200);
  const overageCoin = toInt(fcOverageCallCoinPerMin, 100);

  if (fcPrice < 3480) {
    return NextResponse.json({ error: 'fcMonthlyPriceJpy must be >= 3480' }, { status: 400 });
  }
  if (callCoin < 200) {
    return NextResponse.json({ error: 'callCoinPerMin must be >= 200' }, { status: 400 });
  }
  if (overageCoin < 100) {
    return NextResponse.json({ error: 'fcOverageCallCoinPerMin must be >= 100' }, { status: 400 });
  }

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
      fcMonthlyPriceJpy: fcPrice,
      fcIncludedCallMin: toInt(fcIncludedCallMin, 30),
      callCoinPerMin: callCoin,
      fcOverageCallCoinPerMin: overageCoin,
      freeMessageLimit: freeMessageLimit !== undefined ? toInt(freeMessageLimit, 10) : 10,
      freeCallMinutes: freeCallMinutes !== undefined ? toInt(freeCallMinutes, 5) : 5,
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
    fcMonthlyPriceJpy, fcIncludedCallMin, callCoinPerMin, fcOverageCallCoinPerMin,
    freeMessageLimit, freeCallMinutes,
  } = data;

  const toInt = (v: unknown, fallback = 0) => {
    const n = parseInt(String(v ?? fallback), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  // Validation for provided fields
  if (fcMonthlyPriceJpy !== undefined) {
    const fcPrice = toInt(fcMonthlyPriceJpy, 3480);
    if (fcPrice < 3480) {
      return NextResponse.json({ error: 'fcMonthlyPriceJpy must be >= 3480' }, { status: 400 });
    }
  }
  if (callCoinPerMin !== undefined) {
    const callCoin = toInt(callCoinPerMin, 200);
    if (callCoin < 200) {
      return NextResponse.json({ error: 'callCoinPerMin must be >= 200' }, { status: 400 });
    }
  }
  if (fcOverageCallCoinPerMin !== undefined) {
    const overageCoin = toInt(fcOverageCallCoinPerMin, 100);
    if (overageCoin < 100) {
      return NextResponse.json({ error: 'fcOverageCallCoinPerMin must be >= 100' }, { status: 400 });
    }
  }

  const character = await prisma.character.update({
    where: { id },
    data: {
      name, nameEn, slug, franchise, franchiseEn, description,
      systemPrompt, voiceModelId,
      catchphrases: Array.isArray(catchphrases) ? catchphrases : undefined,
      personalityTraits: personalityTraits !== undefined ? personalityTraits : undefined,
      avatarUrl, coverUrl, isActive,
      fcMonthlyPriceJpy: fcMonthlyPriceJpy !== undefined ? toInt(fcMonthlyPriceJpy, 3480) : undefined,
      fcIncludedCallMin: fcIncludedCallMin !== undefined ? toInt(fcIncludedCallMin, 30) : undefined,
      callCoinPerMin: callCoinPerMin !== undefined ? toInt(callCoinPerMin, 200) : undefined,
      fcOverageCallCoinPerMin: fcOverageCallCoinPerMin !== undefined ? toInt(fcOverageCallCoinPerMin, 100) : undefined,
      freeMessageLimit: freeMessageLimit !== undefined ? toInt(freeMessageLimit, 10) : undefined,
      freeCallMinutes: freeCallMinutes !== undefined ? toInt(freeCallMinutes, 5) : undefined,
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
