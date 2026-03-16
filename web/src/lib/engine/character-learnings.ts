/**
 * CharacterLearnings — 品質フィードバックループ
 * OpenClawの .learnings/ 思想の移植
 * 
 * キャラクターの応答品質を自動追跡し、何が効いて何が効かなかったかを学ぶ
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface LearningEntry {
  type: 'effective' | 'ineffective' | 'voice_break';
  detail: string;
  context?: string;
  timestamp: string;
}

/**
 * 学習記録を保存（CharacterFeedbackテーブルを活用）
 */
export async function recordLearning(
  characterId: string,
  type: LearningEntry['type'],
  detail: string,
  context?: string,
): Promise<void> {
  try {
    await prisma.characterFeedback.create({
      data: {
        characterId,
        userId: 'system',
        type, // effective|ineffective|voice_break
        aiResponse: detail,
        userComment: context ?? null,
        status: 'applied',
        createdAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('[CharacterLearnings] Record error:', error);
  }
}

/**
 * 直近の学習を取得（prompt注入用、最大5件）
 */
export async function getRecentLearnings(
  characterId: string,
  limit: number = 5,
): Promise<LearningEntry[]> {
  try {
    const feedbacks = await prisma.characterFeedback.findMany({
      where: { characterId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
        detail: true,
        context: true,
        createdAt: true,
      },
    });

    return feedbacks.map(f => ({
      type: f.type as LearningEntry['type'],
      detail: f.aiResponse,
      context: f.userComment ?? undefined,
      timestamp: f.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * ユーザーの反応から自動的に学習を記録する
 * セッション終了時に呼び出す
 */
export async function autoLearnFromSession(
  characterId: string,
  sessionStats: {
    avgResponseTimeMs: number; // ユーザーの平均返信時間
    messageCount: number;
    sessionDurationMs: number;
    userDroppedOff: boolean; // ユーザーが途中で離脱したか
  },
): Promise<void> {
  try {
    // 長いセッション（10分+、5メッセージ+）= 効果的なパターン
    if (sessionStats.sessionDurationMs > 600000 && sessionStats.messageCount >= 5) {
      await recordLearning(characterId, 'effective', 
        `長時間セッション: ${Math.round(sessionStats.sessionDurationMs / 60000)}分, ${sessionStats.messageCount}メッセージ`,
        'long_session'
      );
    }

    // 2メッセージ以下で離脱 = 効果的でなかった
    if (sessionStats.userDroppedOff && sessionStats.messageCount <= 2) {
      await recordLearning(characterId, 'ineffective',
        `早期離脱: ${sessionStats.messageCount}メッセージで離脱`,
        'early_dropout'
      );
    }

    // 平均返信が早い（30秒以内）= 興味を引けている
    if (sessionStats.avgResponseTimeMs < 30000 && sessionStats.messageCount >= 3) {
      await recordLearning(characterId, 'effective',
        `高エンゲージメント: 平均${Math.round(sessionStats.avgResponseTimeMs / 1000)}秒で返信`,
        'fast_response'
      );
    }
  } catch (error) {
    logger.error('[CharacterLearnings] AutoLearn error:', error);
  }
}
