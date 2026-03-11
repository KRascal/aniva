/**
 * /api/community/[characterSlug]
 * キャラ別ファン掲示板API
 * GET: スレッド一覧取得
 * POST: 新スレッド作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterSlug: string }> },
) {
  try {
    const { characterSlug } = await params;
    const characterId = await resolveCharacterId(characterSlug);
    if (!characterId) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
    const category = url.searchParams.get('category');
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { characterId };
    if (category && category !== 'all') {
      where.category = category;
    }

    const [threads, total] = await Promise.all([
      prisma.fanThread.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { lastReplyAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
        include: {
          user: { select: { id: true, nickname: true, displayName: true, avatarUrl: true, image: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.fanThread.count({ where }),
    ]);

    // キャラ情報
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });

    return NextResponse.json({
      character,
      threads: threads.map(t => ({
        ...t,
        replyCount: t._count.replies,
        author: t.userId ? t.user : { nickname: character?.name, avatarUrl: character?.avatarUrl, isCharacter: true },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Community] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterSlug: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterSlug } = await params;
    const characterId = await resolveCharacterId(characterSlug);
    if (!characterId) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const { title, content, category = 'general' } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: 'Title too long (max 100)' }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content too long (max 5000)' }, { status: 400 });
    }

    const validCategories = ['general', 'discussion', 'fanart', 'question', 'event'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const thread = await prisma.fanThread.create({
      data: {
        characterId,
        userId: session.user.id,
        title,
        content,
        category,
        lastReplyAt: new Date(),
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error('[Community] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
