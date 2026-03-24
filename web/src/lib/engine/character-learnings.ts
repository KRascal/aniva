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
): Promise<void> {
  try {
    await prisma.characterFeedback.create({
      data: {
        characterId,
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
  }
}

/**
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
        aiResponse: true,
        createdAt: true,
      },
    });

    return feedbacks.map(f => ({
      type: (LEARNING_TYPE_REVERSE[f.type] ?? 'effective') as LearningType,
      detail: f.aiResponse,
      createdAt: f.createdAt,
    }));
  } catch (e) {
    logger.warn('[CharacterLearnings] getLearnings failed:', e);
    return [];
  }
}

/**
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
  }
}
