// ============================================================
// Relationship XP System
// ============================================================

import { prisma } from '../prisma';

/**
 * 関係性経験値を更新（感情状態も同時に保存）
 */
export async function updateRelationshipXP(
  relationshipId: string,
  emotion?: string,
  emotionNote?: string,
  bonusXpMultiplier: number = 1.0,
): Promise<{ leveledUp: boolean; newLevel: number }> {
  const relationship = await prisma.relationship.findUniqueOrThrow({
    where: { id: relationshipId },
  });

  const baseXP = 10;
  const newXP = relationship.experiencePoints + Math.round(baseXP * bonusXpMultiplier);
  const newTotalMessages = relationship.totalMessages + 1;

  // レベルアップ判定
  const levelThresholds = [0, 50, 200, 500, 1000];
  let newLevel = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (newXP >= levelThresholds[i]) {
      newLevel = i + 1;
      break;
    }
  }

  await prisma.relationship.update({
    where: { id: relationshipId },
    data: {
      experiencePoints: newXP,
      totalMessages: newTotalMessages,
      level: Math.min(newLevel, 5),
      lastMessageAt: new Date(),
      firstMessageAt: relationship.firstMessageAt || new Date(),
      ...(emotion !== undefined && {
        characterEmotion: emotion,
        characterEmotionNote: emotionNote ?? null,
        emotionUpdatedAt: new Date(),
      }),
    },
  });

  return { leveledUp: newLevel > relationship.level, newLevel };
}

/**
 * Static method: 指定XPを加算する
 */
export async function addXP(relationshipId: string, xp: number): Promise<void> {
  const relationship = await prisma.relationship.findUniqueOrThrow({
    where: { id: relationshipId },
  });

  const newXP = relationship.experiencePoints + xp;
  const levelThresholds = [0, 50, 200, 500, 1000];
  let newLevel = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (newXP >= levelThresholds[i]) {
      newLevel = i + 1;
      break;
    }
  }

  await prisma.relationship.update({
    where: { id: relationshipId },
    data: {
      experiencePoints: newXP,
      level: Math.min(newLevel, 5),
    },
  });
}
