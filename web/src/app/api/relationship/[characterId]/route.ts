import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    // 認証チェック（IDOR修正: userIdはセッションから取得）
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawCharacterId } = await params;
    // slug/カスタムID両対応
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      include: { character: { select: { id: true, name: true, nameEn: true, slug: true, franchise: true, franchiseEn: true, description: true, avatarUrl: true, coverUrl: true, catchphrases: true, personalityTraits: true, voiceModelId: true } } },
    });

    if (!relationship) {
      return NextResponse.json({
        level: 1,
        levelName: RELATIONSHIP_LEVELS[0].name,
        xp: 0,
        nextLevelXp: RELATIONSHIP_LEVELS[1].xpRequired,
        totalMessages: 0,
      });
    }

    const currentLevel = RELATIONSHIP_LEVELS[relationship.level - 1];
    const nextLevel = RELATIONSHIP_LEVELS[relationship.level] || null;

    // 会話記憶から共有トピックを抽出
    const memo = (relationship.memorySummary ?? {}) as {
      preferences?: { likes?: string[]; dislikes?: string[] };
      importantFacts?: string[];
      recentTopics?: string[];
    };
    const sharedTopics = [
      ...(memo.preferences?.likes ?? []).slice(0, 5).map((l: string) => ({ type: 'like', text: l })),
      ...(memo.importantFacts ?? []).slice(0, 3).map((f: string) => ({ type: 'fact', text: f })),
    ];

    // ストリーク有効判定（最終メッセージが48h以内 = アクティブ）
    const streakDays = relationship.streakDays ?? 0;
    const streakLastDate = relationship.streakLastDate;
    const isStreakActive = streakLastDate
      ? Date.now() - new Date(streakLastDate).getTime() < 48 * 60 * 60 * 1000
      : false;

    // ユーザー設定（IKEA効果）
    const preferences = (memo as { preferences?: { 呼び名?: string; 趣味?: string[] } }).preferences ?? null;

    return NextResponse.json({
      level: relationship.level,
      levelName: currentLevel.name,
      xp: relationship.experiencePoints,
      nextLevelXp: nextLevel?.xpRequired || null,
      totalMessages: relationship.totalMessages,
      firstMessageAt: relationship.firstMessageAt,
      lastMessageAt: relationship.lastMessageAt,
      character: relationship.character,
      isFanclub: relationship.isFanclub,
      isFollowing: relationship.isFollowing,
      sharedTopics, // 覚えてくれてる記憶の可視化
      streakDays: isStreakActive ? streakDays : 0,
      isStreakActive,
      preferences, // あなただけの設定（IKEA効果）
    });
  } catch (error) {
    console.error('[relationship/characterId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    const body = await req.json();
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 20) : undefined;
    const interests = Array.isArray(body.interests) ? body.interests.slice(0, 15) : undefined;

    // 既存 memorySummary を取得してプリファレンスをマージ
    const existing = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { memorySummary: true },
    });

    const memo = (existing?.memorySummary ?? {}) as Record<string, unknown>;
    const prevPrefs = (memo.preferences ?? {}) as Record<string, unknown>;

    const updatedMemo = {
      ...memo,
      preferences: {
        ...prevPrefs,
        ...(nickname !== undefined ? { 呼び名: nickname } : {}),
        ...(interests !== undefined ? { 趣味: interests } : {}),
      },
    };

    await prisma.relationship.upsert({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      update: { memorySummary: updatedMemo },
      create: {
        userId,
        characterId,
        locale: 'ja',
        level: 1,
        experiencePoints: 0,
        totalMessages: 0,
        memorySummary: updatedMemo,
      },
    });

    return NextResponse.json({ success: true, preferences: updatedMemo.preferences });
  } catch (error) {
    console.error('[relationship/characterId PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
