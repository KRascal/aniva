import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// レベル名マッピング
const LEVEL_NAMES: Record<number, string> = {
  1: '出会い', 2: '顔見知り', 3: '友達', 4: '仲良し', 5: '親友',
  6: '特別な存在', 7: '運命の絆', 8: '魂の伴侶', 9: '永遠の誓い', 10: '伝説',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        relationships: {
          where: { isFollowing: true },
          include: {
            character: {
              select: {
                id: true,
                name: true,
                slug: true,
                franchise: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { level: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.profilePublic) {
      return NextResponse.json({
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? user.image,
        profilePublic: false,
      });
    }

    // ガチャカード所持数（レアリティ別）
    const userCards = await prisma.userCard.findMany({
      where: { userId },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            rarity: true,
            cardImageUrl: true,
            franchise: true,
            characterId: true,
            character: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    const cardsByRarity: Record<string, number> = {};
    for (const uc of userCards) {
      const r = uc.card.rarity;
      cardsByRarity[r] = (cardsByRarity[r] ?? 0) + 1;
    }

    // SSR/UR カードをハイライト表示用に抽出
    const rareCards = userCards
      .filter(uc => uc.card.rarity === 'SSR' || uc.card.rarity === 'UR')
      .map(uc => ({
        id: uc.card.id,
        name: uc.card.name,
        rarity: uc.card.rarity,
        cardImageUrl: uc.card.cardImageUrl,
        franchise: uc.card.franchise,
        characterName: uc.card.character?.name ?? null,
        characterAvatar: uc.card.character?.avatarUrl ?? null,
      }));

    // コメントしたモーメンツ
    const recentComments = await prisma.momentComment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        moment: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            character: { select: { name: true, avatarUrl: true, slug: true } },
          },
        },
      },
    });

    // 統計情報
    const totalMessages = user.relationships.reduce((sum, r) => sum + (r.totalMessages ?? 0), 0);
    const maxStreak = Math.max(0, ...user.relationships.map(r => r.streakDays ?? 0));
    const totalFollowing = user.relationships.length;
    const fcCount = user.relationships.filter(r => r.isFanclub).length;
    const maxLevel = Math.max(0, ...user.relationships.map(r => r.level));

    // ===== キャラ別ランキング順位を取得（oshiRankingより先に構築）=====
    const charRankings: Record<string, { rank: number; totalInRanking: number }> = {};
    for (const rel of user.relationships.slice(0, 5)) {
      const higherCount = await prisma.relationship.count({
        where: {
          characterId: rel.characterId,
          isFollowing: true,
          OR: [
            { level: { gt: rel.level } },
            { level: rel.level, experiencePoints: { gt: rel.experiencePoints ?? 0 } },
          ],
        },
      });
      const totalInRanking = await prisma.relationship.count({
        where: { characterId: rel.characterId, isFollowing: true },
      });
      charRankings[rel.characterId] = { rank: higherCount + 1, totalInRanking };
    }

    // 推し度ランキング（レベル×XP順）
    const oshiRanking = user.relationships
      .sort((a, b) => b.level - a.level || (b.experiencePoints ?? 0) - (a.experiencePoints ?? 0))
      .slice(0, 5)
      .map((rel, i) => ({
        rank: i + 1,
        characterId: rel.character.id,
        characterName: rel.character.name,
        characterAvatar: rel.character.avatarUrl,
        franchise: rel.character.franchise,
        level: rel.level,
        levelName: LEVEL_NAMES[rel.level] ?? `Lv.${rel.level}`,
        totalMessages: rel.totalMessages ?? 0,
        streakDays: rel.streakDays ?? 0,
        isFanclub: rel.isFanclub,
        globalRank: charRankings[rel.character.id]?.rank ?? null,
        totalFans: charRankings[rel.character.id]?.totalInRanking ?? null,
        daysSinceFirstMeet: Math.floor((Date.now() - new Date(rel.createdAt).getTime()) / 86400000),
      }));

    // 参加日からの日数
    const daysSinceJoin = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    // ===== 称号/バッジ =====
    const badges: Array<{ id: string; name: string; icon: string; description: string; rarity: string }> = [];
    
    // アーリーアダプター（100人以内）
    const userCount = await prisma.user.count({ where: { createdAt: { lte: user.createdAt } } });
    if (userCount <= 100) badges.push({ id: 'early_adopter', name: 'アーリーアダプター', icon: '⭐', description: '初期100人のユーザー', rarity: 'legendary' });
    if (userCount <= 1000) badges.push({ id: 'pioneer', name: 'パイオニア', icon: '🌟', description: '初期1000人のユーザー', rarity: 'epic' });
    
    // メッセージ数
    if (totalMessages >= 10000) badges.push({ id: 'msg_10k', name: '万語の絆', icon: '💎', description: '10,000通以上のメッセージ', rarity: 'legendary' });
    else if (totalMessages >= 1000) badges.push({ id: 'msg_1k', name: '千語の友', icon: '💬', description: '1,000通以上のメッセージ', rarity: 'epic' });
    else if (totalMessages >= 100) badges.push({ id: 'msg_100', name: '百語の語り手', icon: '📝', description: '100通以上のメッセージ', rarity: 'rare' });
    
    // ストリーク
    if (maxStreak >= 365) badges.push({ id: 'streak_365', name: '不滅の炎', icon: '🔥', description: '365日連続ログイン', rarity: 'legendary' });
    else if (maxStreak >= 30) badges.push({ id: 'streak_30', name: '燃え盛る炎', icon: '🔥', description: '30日連続ログイン', rarity: 'epic' });
    else if (maxStreak >= 7) badges.push({ id: 'streak_7', name: '灯火', icon: '🕯️', description: '7日連続ログイン', rarity: 'rare' });
    
    // URカード
    const urCount = cardsByRarity['UR'] ?? 0;
    if (urCount >= 5) badges.push({ id: 'ur_collector', name: 'URコレクター', icon: '👑', description: 'UR 5枚以上所持', rarity: 'legendary' });
    else if (urCount >= 1) badges.push({ id: 'ur_holder', name: 'UR所持者', icon: '✨', description: 'URカード所持', rarity: 'epic' });
    
    // FC数
    if (fcCount >= 5) badges.push({ id: 'fc_5', name: 'プラチナサポーター', icon: '💜', description: '5キャラ以上のFC加入', rarity: 'legendary' });
    else if (fcCount >= 1) badges.push({ id: 'fc_1', name: 'サポーター', icon: '💜', description: 'FC加入中', rarity: 'rare' });

    // Lv10
    if (maxLevel >= 10) badges.push({ id: 'lv10', name: '伝説の絆', icon: '🏅', description: '親密度Lv.10達成', rarity: 'legendary' });

    // ===== カードコレクション率 =====
    const totalCardTypes = await prisma.gachaCard.count({ where: { isActive: true } });
    const uniqueCards = new Set(userCards.map(uc => uc.cardId)).size;
    const collectionRate = totalCardTypes > 0 ? Math.round((uniqueCards / totalCardTypes) * 100) : 0;

    return NextResponse.json({
      id: user.id,
      displayName: user.displayName,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl ?? user.image,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      profilePublic: user.profilePublic,
      plan: user.plan,
      // 統計
      stats: {
        totalMessages,
        maxStreak,
        totalFollowing,
        fcCount,
        maxLevel,
        totalCards: userCards.length,
        uniqueCards,
        totalCardTypes,
        collectionRate,
        daysSinceJoin,
      },
      // 称号/バッジ
      badges,
      // 推し度ランキング
      oshiRanking,
      // レアカード
      rareCards,
      cardsByRarity,
      // コメントしたモーメンツ
      recentComments: recentComments.map(c => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        moment: {
          id: c.moment.id,
          content: c.moment.content,
          mediaUrl: c.moment.mediaUrl,
          characterName: c.moment.character?.name ?? null,
          characterAvatar: c.moment.character?.avatarUrl ?? null,
          characterSlug: c.moment.character?.slug ?? null,
        },
      })),
      // フォロー中（従来互換）
      following: user.relationships.map(rel => ({
        characterId: rel.character.id,
        characterName: rel.character.name,
        characterSlug: rel.character.slug,
        characterFranchise: rel.character.franchise,
        characterAvatarUrl: rel.character.avatarUrl,
        level: rel.level,
        levelName: LEVEL_NAMES[rel.level] ?? `Lv.${rel.level}`,
        isFanclub: rel.isFanclub,
      })),
    });
  } catch (error) {
    logger.error('[users/[userId]/profile] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
