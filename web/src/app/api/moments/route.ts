import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;

    const url = new URL(req.url);
    const characterId = url.searchParams.get('characterId') ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
    const cursor = url.searchParams.get('cursor') ?? undefined;

    const now = new Date();

    // ユーザーのplan と relationship level を取得
    let userPlan: string = 'FREE';
    let userRelationships: Record<string, number> = {};
    let followingCharacterIds: string[] | null = null; // null = フィルタなし（characterId指定時）
    // FC加入状態: characterId → true/false
    const fcSubscribedCharacterIds: Set<string> = new Set();

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      userPlan = user?.plan ?? 'FREE';

      const relationships = await prisma.relationship.findMany({
        where: { userId },
        select: { characterId: true, level: true, isFollowing: true },
      });
      for (const r of relationships) {
        userRelationships[r.characterId] = r.level;
      }

      // CharacterSubscription（FC加入状態）を取得
      const fcSubs = await prisma.characterSubscription.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          ...(characterId ? { characterId } : {}),
        },
        select: { characterId: true },
      });
      for (const sub of fcSubs) {
        fcSubscribedCharacterIds.add(sub.characterId);
      }

      // characterId 未指定の場合はフォロー中のキャラのみ
      if (!characterId) {
        followingCharacterIds = relationships
          .filter((r: { characterId: string; level: number; isFollowing: boolean }) => r.isFollowing)
          .map((r: { characterId: string; level: number; isFollowing: boolean }) => r.characterId);
      }
    }

    // Momentsを取得
    const moments = await prisma.moment.findMany({
      where: {
        ...(characterId
          ? { characterId }
          : followingCharacterIds !== null
          ? { characterId: { in: followingCharacterIds } }
          : {}),
        publishedAt: {
          not: null,
          lte: now,
        },
      },
      include: {
        character: { select: { name: true, avatarUrl: true } },
        reactions: { select: { userId: true, type: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (moments.length > limit) {
      const next = moments.pop();
      nextCursor = next!.id;
    }

    type MomentWithRelations = {
      id: string;
      characterId: string;
      character: { name: string; avatarUrl: string | null };
      type: string;
      content: string | null;
      mediaUrl: string | null;
      visibility: string;
      levelRequired: number;
      publishedAt: Date | null;
      reactions: { userId: string; type: string }[];
    };
    const result = (moments as MomentWithRelations[]).map((moment) => {
      const reactionCount = moment.reactions.filter((r) => r.type === 'like').length;
      const userHasLiked = userId
        ? moment.reactions.some((r) => r.userId === userId && r.type === 'like')
        : false;

      // アクセス権チェック
      let isLocked = false;
      if (moment.visibility === 'PUBLIC') {
        isLocked = false;
      } else if (moment.visibility === 'STANDARD') {
        isLocked = !['STANDARD', 'PREMIUM'].includes(userPlan);
      } else if (moment.visibility === 'PREMIUM') {
        isLocked = !fcSubscribedCharacterIds.has(moment.characterId);
      } else if (moment.visibility === 'LEVEL_LOCKED') {
        const userLevel = userRelationships[moment.characterId] ?? 0;
        isLocked = userLevel < moment.levelRequired;
      }

      return {
        id: moment.id,
        characterId: moment.characterId,
        character: moment.character,
        type: moment.type,
        content: isLocked ? null : moment.content,
        mediaUrl: isLocked ? null : moment.mediaUrl,
        visibility: moment.visibility,
        levelRequired: moment.levelRequired,
        publishedAt: moment.publishedAt!.toISOString(),
        reactionCount,
        userHasLiked,
        isLocked,
      };
    });

    const isFollowingNone = followingCharacterIds !== null && followingCharacterIds.length === 0;
    return NextResponse.json({ moments: result, nextCursor, isFollowingNone });
  } catch (error) {
    console.error('GET /api/moments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（管理者操作のため必須）
    const postSession = await auth();
    const postUserId = (postSession?.user as any)?.id as string | undefined;
    if (!postUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { characterId, type, content, mediaUrl, visibility, levelRequired, scheduledAt } = body;

    if (!characterId || !type || !visibility) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const publishedAt = scheduledAt ? new Date(scheduledAt) : new Date();

    const moment = await prisma.moment.create({
      data: {
        characterId,
        type,
        content: content ?? null,
        mediaUrl: mediaUrl ?? null,
        visibility,
        levelRequired: levelRequired ?? 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt,
      },
    });

    return NextResponse.json(moment, { status: 201 });
  } catch (error) {
    console.error('POST /api/moments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
