import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        avatarUrl: true,
        image: true,
        coverImageUrl: true,
        bio: true,
        profilePublic: true,
        plan: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // avatarUrl未設定時はOAuth image にフォールバック（ランキングと統一）
    // 注意: avatarUrlが空文字列''の場合もフォールバックする（??ではなく||を使用）
    const resolvedAvatarUrl = user.avatarUrl || user.image || null;

    // avatarUrlが空でimageに値がある場合、DBのavatarUrlを自動修復（次回以降の不整合を防止）
    if (!user.avatarUrl && user.image) {
      prisma.user.update({
        where: { email: session.user.email },
        data: { avatarUrl: user.image },
      }).catch(() => { /* best-effort repair */ });
    }

    return NextResponse.json({
      ...user,
      avatarUrl: resolvedAvatarUrl,
    });
  } catch (error) {
    logger.error('[users/me] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, nickname, avatarUrl, coverImageUrl, bio, profilePublic } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = String(displayName).slice(0, 30) || null;
    if (nickname !== undefined) updateData.nickname = String(nickname).slice(0, 30) || null;
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl ? String(avatarUrl) : null;
      // image カラムも同期（GET時のフォールバックで整合性を保つ）
      if (avatarUrl) updateData.image = String(avatarUrl);
    }
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl ? String(coverImageUrl) : null;
    if (bio !== undefined) updateData.bio = bio ? String(bio).slice(0, 200) : null;
    if (profilePublic !== undefined) updateData.profilePublic = Boolean(profilePublic);

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        avatarUrl: true,
        coverImageUrl: true,
        bio: true,
        profilePublic: true,
        plan: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    logger.error('[users/me PUT] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
