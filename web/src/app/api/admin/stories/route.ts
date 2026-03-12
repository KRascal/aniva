import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get('characterId');

    const where: Record<string, unknown> = {};
    if (characterId) where.characterId = characterId;

    const [chapters, total] = await prisma.$transaction([
      prisma.storyChapter.findMany({
        where,
        include: {
          character: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ characterId: 'asc' }, { chapterNumber: 'asc' }],
      }),
      prisma.storyChapter.count({ where }),
    ]);

    return NextResponse.json({ chapters, total });
  } catch (error) {
    logger.error('[GET /api/admin/stories]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      characterId,
      chapterNumber,
      locale = 'ja',
      title,
      synopsis,
      unlockLevel = 1,
      isFcOnly = false,
      triggerPrompt,
      isActive = true,
      backgroundUrl,
      coinReward = 5,
    } = body;

    if (!characterId || !chapterNumber || !title || !synopsis || !triggerPrompt) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const chapter = await prisma.storyChapter.create({
      data: {
        characterId,
        chapterNumber: Number(chapterNumber),
        locale,
        title,
        synopsis,
        unlockLevel: Number(unlockLevel),
        isFcOnly,
        triggerPrompt,
        isActive,
        backgroundUrl: backgroundUrl || null,
        coinReward: Number(coinReward),
      },
      include: {
        character: { select: { id: true, name: true } },
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.STORY_CREATE, admin.email, {
      chapterId: chapter.id, title, characterId, chapterNumber: Number(chapterNumber),
    });

    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/stories]', error);
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

    const chapter = await prisma.storyChapter.update({
      where: { id },
      data: {
        ...(data.characterId !== undefined && { characterId: data.characterId }),
        ...(data.chapterNumber !== undefined && { chapterNumber: Number(data.chapterNumber) }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.synopsis !== undefined && { synopsis: data.synopsis }),
        ...(data.unlockLevel !== undefined && { unlockLevel: Number(data.unlockLevel) }),
        ...(data.isFcOnly !== undefined && { isFcOnly: data.isFcOnly }),
        ...(data.triggerPrompt !== undefined && { triggerPrompt: data.triggerPrompt }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.backgroundUrl !== undefined && { backgroundUrl: data.backgroundUrl || null }),
        ...(data.coinReward !== undefined && { coinReward: Number(data.coinReward) }),
      },
    });

    await adminAudit(ADMIN_AUDIT_ACTIONS.STORY_UPDATE, admin.email, {
      chapterId: id,
    });

    return NextResponse.json({ chapter });
  } catch (error) {
    logger.error('[PUT /api/admin/stories]', error);
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

    await prisma.storyChapter.delete({ where: { id } });

    await adminAudit(ADMIN_AUDIT_ACTIONS.STORY_DELETE, admin.email, {
      chapterId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/stories]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
