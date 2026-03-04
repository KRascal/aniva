/**
 * ガチャ引きロジック
 * レアリティ確率: N(50%) R(30%) SR(15%) SSR(4%) UR(1%)
 * pity: 50連でSR以上確定, 100連でSSR以上確定
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface PullResult {
  card: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    rarity: GachaRarity;
    characterId: string;
  };
  isNew: boolean;
  rarity: GachaRarity;
}

interface GachaSession {
  gachaCount: number;
  lastSSR: number;
}

function rollRarity(session: GachaSession): GachaRarity {
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

  const cardWhere = banner.characterId ? { characterId: banner.characterId } : {};
  const allCards = await prisma.gachaCard.findMany({ where: cardWhere });

  if (allCards.length === 0) {
    throw new Error('No cards available in this banner');
  }

  const userExistingCards = await prisma.userCard.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const existingCardIds = new Set(userExistingCards.map((uc) => uc.cardId));

  const results: PullResult[] = [];
  const newCards: { userId: string; cardId: string; source: string }[] = [];

  for (let i = 0; i < count; i++) {
    gachaSession.gachaCount += 1;
    const rarity = rollRarity(gachaSession);

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

    results.push({
      card: {
        id: card.id,
        name: card.name,
        description: card.description,
        imageUrl: card.imageUrl,
        rarity: card.rarity as GachaRarity,
        characterId: card.characterId,
      },
      isNew,
      rarity: card.rarity as GachaRarity,
    });
  }

  if (newCards.length > 0) {
    await prisma.userCard.createMany({
      data: newCards,
      skipDuplicates: true,
    });
  }

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
