<<<<<<< HEAD
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
=======
// ============================================================
// CharacterLearnings — 品質フィードバックループ
// ユーザーの反応を自動分類し、プロンプトに注入する
// PrismaのCharacterFeedbackテーブルを活用
// エラー時は既存動作にフォールバック
// ============================================================

import { prisma } from '../prisma';
import { logger } from '../logger';

export type LearningType = 'effective' | 'ineffective' | 'voice_break';

export interface CharacterLearning {
  type: LearningType;
  detail: string;
  createdAt: Date;
}

/**
 * LearningTypeをCharacterFeedbackのtype値にマッピング
 */
const LEARNING_TYPE_MAP: Record<LearningType, string> = {
  effective: 'learning_effective',
  ineffective: 'learning_ineffective',
  voice_break: 'learning_voice_break',
};

const LEARNING_TYPE_REVERSE: Record<string, LearningType> = {
  learning_effective: 'effective',
  learning_ineffective: 'ineffective',
  learning_voice_break: 'voice_break',
};

/**
 * 学習記録を保存する
 * PrismaのCharacterFeedbackテーブルを利用（スキーマ変更なし）
 */
export async function recordLearning(
  characterId: string,
  type: LearningType,
  detail: string,
  userId: string = 'system',
  messageId?: string,
>>>>>>> origin/staging
): Promise<void> {
  try {
    await prisma.characterFeedback.create({
      data: {
        characterId,
<<<<<<< HEAD
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
=======
        userId,
        messageId: messageId ?? null,
        type: LEARNING_TYPE_MAP[type],
        aiResponse: detail,
        userMessage: null,
        status: 'applied',
      },
    });
    logger.debug(`[CharacterLearnings] Recorded ${type} learning for character ${characterId}`);
  } catch (e) {
    // エラーはサイレントにスキップ（既存を壊さない）
    logger.warn('[CharacterLearnings] recordLearning failed:', e);
>>>>>>> origin/staging
  }
}

/**
<<<<<<< HEAD
 * 直近の学習を取得（prompt注入用、最大5件）
 */
export async function getRecentLearnings(
  characterId: string,
  limit: number = 5,
): Promise<LearningEntry[]> {
  try {
    const feedbacks = await prisma.characterFeedback.findMany({
      where: { characterId },
=======
 * 直近の学習記録を取得する（最大5件）
 */
export async function getLearnings(
  characterId: string,
  limit: number = 5,
): Promise<CharacterLearning[]> {
  try {
    const feedbacks = await prisma.characterFeedback.findMany({
      where: {
        characterId,
        type: {
          in: Object.values(LEARNING_TYPE_MAP),
        },
        status: 'applied',
      },
>>>>>>> origin/staging
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
<<<<<<< HEAD
        detail: true,
        context: true,
=======
        aiResponse: true,
>>>>>>> origin/staging
        createdAt: true,
      },
    });

    return feedbacks.map(f => ({
<<<<<<< HEAD
      type: f.type as LearningEntry['type'],
      detail: f.aiResponse,
      context: f.userComment ?? undefined,
      timestamp: f.createdAt.toISOString(),
    }));
  } catch {
=======
      type: (LEARNING_TYPE_REVERSE[f.type] ?? 'effective') as LearningType,
      detail: f.aiResponse,
      createdAt: f.createdAt,
    }));
  } catch (e) {
    logger.warn('[CharacterLearnings] getLearnings failed:', e);
>>>>>>> origin/staging
    return [];
  }
}

/**
<<<<<<< HEAD
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
=======
 * 学習記録をプロンプト注入用テキストに変換する
 */
export function formatLearningsForPrompt(learnings: CharacterLearning[]): string {
  if (learnings.length === 0) return '';

  const effective = learnings.filter(l => l.type === 'effective');
  const ineffective = learnings.filter(l => l.type === 'ineffective');
  const voiceBreaks = learnings.filter(l => l.type === 'voice_break');

  const parts: string[] = ['## 最近の学び（自動フィードバック）'];

  if (effective.length > 0) {
    parts.push('### ✅ 効果的だったアプローチ');
    effective.forEach(l => parts.push(`- ${l.detail}`));
  }

  if (ineffective.length > 0) {
    parts.push('### ⚠️ 効果が低かったアプローチ（避けること）');
    ineffective.forEach(l => parts.push(`- ${l.detail}`));
  }

  if (voiceBreaks.length > 0) {
    parts.push('### 🚫 キャラ崩壊パターン（絶対に繰り返さない）');
    voiceBreaks.forEach(l => parts.push(`- ${l.detail}`));
  }

  return parts.join('\n');
}

/**
 * キャラクターの学習コンテキストをプロンプト用に構築する
 * エラー時は空文字を返す（既存を壊さない）
 */
export async function buildLearningsContext(characterId: string): Promise<string> {
  try {
    const learnings = await getLearnings(characterId, 5);
    return formatLearningsForPrompt(learnings);
  } catch (e) {
    logger.warn('[CharacterLearnings] buildLearningsContext failed:', e);
    return '';
  }
}

// ── 自動判定ユーティリティ ────────────────────────────────

/**
 * ユーザーの返信時間から反応を自動判定する
 * - 短い返信時間 → effective（会話が盛り上がっている）
 * - 長い返信時間 or 返信なし → ineffective
 */
export function detectLearningTypeFromResponseTime(
  responseTimeMs: number,
  messageContent: string,
): LearningType | null {
  // 返信が3秒未満 → 非常に効果的
  if (responseTimeMs < 3000) return 'effective';

  // 返信が30分以上 → 効果が低い
  if (responseTimeMs > 30 * 60 * 1000) return 'ineffective';

  // キャラ崩壊パターンの検出
  const voiceBreakPatterns = [
    /私はAI/,
    /人工知能/,
    /大規模言語モデル/,
    /LLM/,
    /語ることができません/,
  ];
  if (voiceBreakPatterns.some(p => p.test(messageContent))) {
    return 'voice_break';
  }

  return null;
}

/**
 * 返信内容から自動的に学習記録を保存する
 * エラー時はスキップ
 */
export async function autoRecordFromResponse(
  characterId: string,
  userId: string,
  aiResponse: string,
  userMessage: string,
  responseTimeMs?: number,
): Promise<void> {
  try {
    // キャラ崩壊パターンの自動検出
    const voiceBreakPatterns = [
      /私はAI/,
      /人工知能です/,
      /大規模言語モデル/,
      /LLM/,
    ];

    if (voiceBreakPatterns.some(p => p.test(aiResponse))) {
      await recordLearning(
        characterId,
        'voice_break',
        `AIであることを明かした: "${aiResponse.substring(0, 100)}..."`,
        userId,
      );
      return;
    }

    // 返信時間による自動判定
    if (responseTimeMs !== undefined) {
      const learningType = detectLearningTypeFromResponseTime(responseTimeMs, aiResponse);
      if (learningType && learningType !== 'voice_break') {
        const summary =
          learningType === 'effective'
            ? `素早い返信（${Math.round(responseTimeMs / 1000)}秒）: "${userMessage.substring(0, 50)}..."`
            : `返信に時間がかかった（${Math.round(responseTimeMs / 60000)}分）: "${userMessage.substring(0, 50)}..."`;

        await recordLearning(characterId, learningType, summary, userId);
      }
    }
  } catch (e) {
    logger.warn('[CharacterLearnings] autoRecordFromResponse failed:', e);
>>>>>>> origin/staging
  }
}
