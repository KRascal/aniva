/**
 * GET /api/fc/content?characterId=xxx
 * FC限定コンテンツ取得（SecretContent + PREMIUM Moments統合）
 * FC会員のみ閲覧可
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const rawCharacterId = url.searchParams.get('characterId');
    if (!rawCharacterId) {
      return NextResponse.json({ error: 'characterId required' }, { status: 400 });
    }

    const characterId = (await resolveCharacterId(rawCharacterId)) ?? rawCharacterId;

    // FC会員チェック
    const subscription = await prisma.characterSubscription.findFirst({
      where: { userId, characterId, status: 'ACTIVE' },
    });

    if (!subscription) {
      return NextResponse.json({ items: [], locked: true });
    }

    // ユーザーの関係レベル取得
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { level: true },
    });
    const userLevel = relationship?.level ?? 1;

    // SecretContent取得（レベル条件でフィルタ）
    const secretContents = await prisma.secretContent.findMany({
      where: { characterId, unlockLevel: { lte: userLevel } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        unlockLevel: true,
        createdAt: true,
      },
    });

    // PREMIUM Moments取得
    const premiumMoments = await prisma.moment.findMany({
      where: { characterId, visibility: 'PREMIUM' },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      include: {
        character: { select: { name: true, avatarUrl: true } },
      },
    });

    // 統合レスポンス
    const items = [
      ...secretContents.map(sc => ({
        id: sc.id,
        kind: 'secret' as const,
        type: sc.type,
        title: sc.title,
        content: sc.content,
        unlockLevel: sc.unlockLevel,
        createdAt: sc.createdAt.toISOString(),
      })),
      ...premiumMoments.map(m => ({
        id: m.id,
        kind: 'moment' as const,
        type: 'premium_post',
        title: null,
        content: m.content,
        unlockLevel: null,
        createdAt: (m.publishedAt ?? m.createdAt).toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ items, locked: false, userLevel });
  } catch (error) {
    logger.error('[FC Content] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
