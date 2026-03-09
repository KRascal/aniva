/**
 * ガチャ引きロジック
 * レアリティ確率: N(50%) R(30%) SR(15%) SSR(4%) UR(1%)
 * pity: 50連でSR以上確定, 100連でSSR以上確定
 * ceiling: banner.ceilingCount に達したらUR確定（天井）
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface PityInfo {
  current: number;
  ceiling: number;
  remaining: number;
}

export interface PullResult {
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    cardImageUrl?: string | null;
    illustrationUrl?: string | null;
    frameType?: string | null;
    rarity: GachaRarity;
    characterId: string;
    characterSlug?: string | null;
    franchise?: string | null;
    character?: { id: string; name: string; avatarUrl: string | null } | null;
  };
  isNew: boolean;
  rarity: GachaRarity;
  pityInfo?: PityInfo;
}

interface GachaSession {
  gachaCount: number;
  lastSSR: number;
}

function rollRarity(session: GachaSession, fcBoost = false): GachaRarity {
  const sinceLastSSR = session.gachaCount - session.lastSSR;

  // 100連でSSR以上確定
  if (sinceLastSSR >= 100) return 'SSR';
  // 50連でSR以上確定
  if (session.gachaCount > 0 && session.gachaCount % 50 === 0) {
    const rand = Math.random() * 100;
    if (rand < 1) return 'UR';
    if (rand < 5) return 'SSR';
    return 'SR';
  }

  const rand = Math.random() * 100;
  // FC会員: SR以上の確率1.5倍（UR:1.5%, SSR:7.5%, SR:22.5%）
  if (fcBoost) {
    if (rand < 1.5) return 'UR';
    if (rand < 9) return 'SSR';
    if (rand < 31.5) return 'SR';
    if (rand < 55) return 'R';
    return 'N';
  }
  if (rand < 1) return 'UR';
  if (rand < 5) return 'SSR';
  if (rand < 20) return 'SR';
  if (rand < 50) return 'R';
  return 'N';
}

export async function pullGacha(
  userId: string,
  bannerId: string,
  count: 1 | 10,
  source: string = 'gacha',
): Promise<PullResult[]> {
  const banner = await prisma.gachaBanner.findUniqueOrThrow({ where: { id: bannerId } });

  // FC会員かチェック（FC会員はSR以上の確率1.5倍）
  const fcSub = banner.characterId
    ? await prisma.characterSubscription.findFirst({
        where: { userId, characterId: banner.characterId, status: 'ACTIVE' },
        select: { id: true },
      })
    : null;
  const isFcMember = !!fcSub;

  let gachaSession: GachaSession = { gachaCount: 0, lastSSR: 0 };

  let relationshipId: string | null = null;
  if (banner.characterId) {
    const relationship = await prisma.relationship.findFirst({
      where: { userId, characterId: banner.characterId },
    });
    if (relationship) {
      relationshipId = relationship.id;
      const milestones = Array.isArray(relationship.milestones)
        ? (relationship.milestones as Record<string, unknown>[])
        : [];
      const sessionEntry = milestones.find((m) => m.type === 'gacha_session');
      if (sessionEntry) {
        gachaSession = sessionEntry.data as GachaSession;
      }
    }
  }

  // フランチャイズでフィルタ（優先）、なければcharacterIdでフィルタ
  const cardWhere: Record<string, unknown> = {};
  if (banner.franchise) {
    cardWhere.franchise = banner.franchise;
  } else if (banner.characterId) {
    cardWhere.characterId = banner.characterId;
  }
  const allCards = await prisma.gachaCard.findMany({
    where: cardWhere,
    include: { character: { select: { id: true, slug: true, name: true, avatarUrl: true } } },
  });

  if (allCards.length === 0) {
    throw new Error('No cards available in this banner');
  }

  const userExistingCards = await prisma.userCard.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const existingCardIds = new Set(userExistingCards.map((uc) => uc.cardId));

  // ── 天井（pity）カウント取得 ──
  const pityRecord = await prisma.userGachaPity.upsert({
    where: { userId_bannerId: { userId, bannerId } },
    create: { userId, bannerId, pullCount: 0 },
    update: {},
  });
  let currentPullCount = pityRecord.pullCount;
  const ceilingCount = banner.ceilingCount;

  const results: PullResult[] = [];
  const newCards: { userId: string; cardId: string; source: string }[] = [];

  for (let i = 0; i < count; i++) {
    gachaSession.gachaCount += 1;
    currentPullCount += 1;

    let rarity: GachaRarity;

    // 天井到達チェック（UR確定）
    if (currentPullCount >= ceilingCount) {
      rarity = 'UR';
      currentPullCount = 0; // 天井到達でリセット
    } else {
      rarity = rollRarity(gachaSession, isFcMember);
    }

    if (rarity === 'SSR' || rarity === 'UR') {
      gachaSession.lastSSR = gachaSession.gachaCount;
    }

    const rarityCards = allCards.filter((c) => c.rarity === rarity);
    const cardPool = rarityCards.length > 0 ? rarityCards : allCards;
    const card = cardPool[Math.floor(Math.random() * cardPool.length)];

    const isNew = !existingCardIds.has(card.id);
    if (isNew) {
      existingCardIds.add(card.id);
      newCards.push({ userId, cardId: card.id, source });
    }

    const pityInfo: PityInfo = {
      current: currentPullCount,
      ceiling: ceilingCount,
      remaining: Math.max(0, ceilingCount - currentPullCount),
    };

    results.push({
      card: {
        id: card.id,
        name: card.name,
        description: card.description,
        imageUrl: card.imageUrl,
        cardImageUrl: card.cardImageUrl,
        illustrationUrl: card.illustrationUrl,
        frameType: card.frameType,
        rarity: card.rarity as GachaRarity,
        characterId: card.characterId,
        characterSlug: card.character?.slug ?? null,
        franchise: card.franchise,
        character: card.character ? { id: card.character.id, name: card.character.name, avatarUrl: card.character.avatarUrl } : null,
      },
      isNew,
      rarity: card.rarity as GachaRarity,
      pityInfo,
    });
  }

  if (newCards.length > 0) {
    await prisma.userCard.createMany({
      data: newCards,
      skipDuplicates: true,
    });
  }

  // ── pityカウントを保存 ──
  await prisma.userGachaPity.update({
    where: { userId_bannerId: { userId, bannerId } },
    data: { pullCount: currentPullCount },
  });

  // GachaSessionをRelationship.milestonesに保存
  if (relationshipId) {
    const rel = await prisma.relationship.findUniqueOrThrow({ where: { id: relationshipId } });
    const milestones = Array.isArray(rel.milestones)
      ? (rel.milestones as Record<string, unknown>[]).filter((m) => m.type !== 'gacha_session')
      : [];
    milestones.push({ type: 'gacha_session', data: gachaSession });
    await prisma.relationship.update({
      where: { id: relationshipId },
      data: { milestones: milestones as unknown as Prisma.InputJsonValue },
    });
  }

  return results;
}

export async function getFreeGachaAvailable(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayFreeGacha = await prisma.userCard.findFirst({
    where: {
      userId,
      source: 'login_bonus',
      obtainedAt: { gte: today },
    },
  });

  return !todayFreeGacha;
}

export async function getPityInfo(userId: string, bannerId: string): Promise<PityInfo> {
  const banner = await prisma.gachaBanner.findUnique({ where: { id: bannerId } });
  if (!banner) throw new Error('Banner not found');

  const pityRecord = await prisma.userGachaPity.findUnique({
    where: { userId_bannerId: { userId, bannerId } },
  });

  const current = pityRecord?.pullCount ?? 0;
  const ceiling = banner.ceilingCount;

  return {
    current,
    ceiling,
    remaining: Math.max(0, ceiling - current),
  };
}
