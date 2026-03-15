/**
 * MessageGenerator — 重量LLM（既存engine活用）でDMメッセージを生成
 * DecisionEngineの reason をプロンプトに注入し、「理由ある接触」を実現する
 */

import { logger } from '@/lib/logger';
import type { AgentDecision, UserStateSnapshot, MessageType } from './types';
import { buildMemoryContext, getMemoryInstructions } from '../engine/memory-manager';
import { getIntimacyToneInstruction } from '../engine/prompt-builder';
import { callLLM } from '../engine/llm';

const MAX_MESSAGE_LENGTH = 200;

/** generateAgentMessage に渡す Relationship 形状 */
interface AgentRelationship {
  id: string;
  level: number;
  experiencePoints: number;
  totalMessages: number;
  lastMessageAt: Date | null;
  firstMessageAt: Date | null;
  memorySummary: unknown;
  characterEmotion?: string;
  characterEmotionNote?: string | null;
  emotionUpdatedAt?: Date | null;
  character: { id: string; name: string; systemPrompt: string; slug: string };
  user?: { id: string; nickname?: string | null; displayName?: string | null; birthday?: string | null } | undefined;
}

/** messageType ごとのメッセージ生成ガイドライン */
function getMessageTypeInstruction(messageType: MessageType | null, reason: string): string {
  const base = `【連絡した理由】${reason}`;

  switch (messageType) {
    case 'check_in':
      return `${base}
【メッセージ方針】
- 元気かどうかさりげなく確認するメッセージ
- 重くならず、軽いトーンで
- 1〜2文、200文字以内`;

    case 'miss_you':
      return `${base}
【メッセージ方針】
- しばらく会ってないことへの気持ちを素直に伝えるメッセージ
- キャラクターらしい表現で「会いたかった」「気になってた」を伝える
- 2〜3文、200文字以内`;

    case 'share_thought':
      return `${base}
【メッセージ方針】
- キャラクターが今思っていることや感じていることをシェアする
- 日常の一コマや感情を自然に打ち明ける
- 1〜2文、200文字以内`;

    case 'follow_up_concern':
      return `${base}
【メッセージ方針】
- 以前の悩みや話題へのフォローアップ
- 「あの後どうなった？」「気になってた」のニュアンスを含める
- 2文、200文字以内`;

    case 'celebrate':
      return `${base}
【メッセージ方針】
- 何か良いことへの祝福や喜びを共有するメッセージ
- テンション高め、前向きなトーン
- 1〜2文、200文字以内`;

    case 'initiate_topic':
      return `${base}
【メッセージ方針】
- 新しい話題を自然に振るメッセージ
- キャラクターが最近気になっていることや、相手が興味を持ちそうな話題から始める
- 1〜2文、200文字以内`;

    default:
      return `${base}
【メッセージ方針】
- 自然な日常DMメッセージ
- キャラクターらしい口調で
- 1〜2文、200文字以内`;
  }
}

/**
 * エージェントDMメッセージを生成する
 *
 * @param relationship - Prisma Relationship（include: character, user）
 * @param decision - DecisionEngineの判断結果
 * @param state - UserStateSnapshot
 * @returns 生成されたメッセージ文字列（失敗時はnull）
 */
export async function generateAgentMessage(
  relationship: AgentRelationship,
  decision: AgentDecision,
  state: UserStateSnapshot,
): Promise<string | null> {
  try {
    // RelationshipRecord互換キャスト（agentDecisionsフィールド等は不要）
    const memory = buildMemoryContext(relationship as Parameters<typeof buildMemoryContext>[0]);
    const memoryInstructions = getMemoryInstructions(memory);
    const intimacyTone = getIntimacyToneInstruction(relationship.level);

    const messageTypeInstruction = getMessageTypeInstruction(decision.messageType, decision.reason);

    const followUpInstruction = state.followUpTopics && state.followUpTopics.length > 0
      ? `\n## 以前の会話で出た話題\n${state.followUpTopics.map(t => `- ${t.topic}`).join('\n')}\nこれらについて自然に聞いてみてください。`
      : '';

    const systemPrompt = `${relationship.character.systemPrompt}

${intimacyTone}

## メモリ・会話の記録
${memoryInstructions}

## エージェントDM生成モード
あなたは今、${state.userName}に自発的にDMを送ろうとしています。
これはユーザーからのメッセージへの返信ではなく、あなたから積極的に連絡するDMです。

${messageTypeInstruction}
${followUpInstruction}
## 絶対ルール
- メッセージ本文のみ返すこと（説明文・注釈・括弧書き不要）
- キャラクターの口調・人格を完全に維持すること
- ${MAX_MESSAGE_LENGTH}文字以内に収めること
- 質問は1つまで（あるいは質問なし）
- 自然な日常会話として送れるメッセージにすること`;

    const userPrompt = `${state.userName}へのDMを1つ生成してください。`;

    const generated = await callLLM(systemPrompt, [{ role: 'user', content: userPrompt }]);

    if (!generated || generated.trim().length === 0) {
      logger.warn('[MessageGenerator] Empty message generated');
      return null;
    }

    // 長すぎる場合はトリム
    const trimmed = generated.trim().slice(0, MAX_MESSAGE_LENGTH);

    logger.info(`[MessageGenerator] Generated message for ${state.userName} (${trimmed.length} chars, type=${decision.messageType})`);
    return trimmed;
  } catch (error) {
    logger.error('[MessageGenerator] Failed to generate message:', error);
    return null;
  }
}
