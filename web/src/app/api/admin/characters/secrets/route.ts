import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { CHARACTER_SECRETS } from '@/lib/secret-content';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const slug = req.nextUrl.searchParams.get('slug');
  const characterId = req.nextUrl.searchParams.get('characterId');

  if (!slug && !characterId) return NextResponse.json([], { status: 200 });

  // Find character
  let charId = characterId;
  if (!charId && slug) {
    const char = await prisma.character.findUnique({ where: { slug }, select: { id: true } });
    if (char) charId = char.id;
  }

  if (charId) {
    // Try DB first
    const dbSecrets = await prisma.secretContent.findMany({
      where: { characterId: charId },
      orderBy: [{ order: 'asc' }, { unlockLevel: 'asc' }],
    });

    if (dbSecrets.length > 0) {
      return NextResponse.json(dbSecrets);
    }
  }

  // Fallback to hardcoded
  if (slug) {
    const secrets = CHARACTER_SECRETS[slug] ?? [];
    return NextResponse.json(
      secrets.map((s) => ({
        unlockLevel: s.unlockLevel,
        title: s.title,
        type: s.type,
        content: s.content,
        promptAddition: s.promptAddition ?? null,
      }))
    );
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { characterId, unlockLevel, type, title, content, promptAddition, order } = body;

  if (!characterId || !title || !content) {
    return NextResponse.json({ error: 'characterId, title, content は必須です' }, { status: 400 });
  }

  const secret = await prisma.secretContent.create({
    data: {
      characterId,
      unlockLevel: unlockLevel ?? 3,
      type: type ?? 'conversation_topic',
      title,
      content,
      promptAddition: promptAddition ?? null,
      order: order ?? 0,
    },
  });

  return NextResponse.json(secret);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, unlockLevel, type, title, content, promptAddition, order } = body;

  if (!id) {
    return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
  }

  const secret = await prisma.secretContent.update({
    where: { id },
    data: {
      ...(unlockLevel !== undefined && { unlockLevel }),
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(promptAddition !== undefined && { promptAddition }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json(secret);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 });

  await prisma.secretContent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
