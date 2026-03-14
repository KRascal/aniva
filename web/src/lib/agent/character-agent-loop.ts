/**
 * CharacterAgentLoop — エージェントパイプラインのオーケストレーター
 *
 * 実行フロー:
 *   getTargetRelationships
 *     → collectUserState
 *       → checkTimingGuard
 *         → decideContact (DecisionEngine)
 *           → generateAgentMessage (MessageGenerator)
 *             → deliverAgentMessage (DeliveryWriter)
 *
 * DRY_RUN モード: AGENT_DRY_RUN=true で送信せずログのみ
 */

import { logger } from '@/lib/logger';
import { prisma } from '../prisma';
import { collectUserState, getTargetRelationships } from './user-state-collector';
import { checkTimingGuard } from './timing-guard';
import { decideContact } from './decision-engine';
import { generateAgentMessage } from './message-generator';
import { deliverAgentMessage, recordAgentDecision } from './delivery-writer';
import { getActiveFollowUps, markAsSent } from './followup-scheduler';
import {
  DEFAULT_AGENT_CONFIG,
  type AgentLoopConfig,
  type AgentPipelineResult,
} from './types';

interface AgentLoopSummary {
  totalProcessed: number;
  decided: number;
  delivered: number;
  skippedByTiming: number;
  skippedByDecision: number;
  errors: number;
  dryRun: boolean;
  durationMs: number;
}

/**
 * 1つのRelationshipに対してパイプラインを実行する
 */
async function runPipelineForRelationship(
  relationshipId: string,
  config: AgentLoopConfig,
): Promise<AgentPipelineResult> {
  const pipelineStart = Date.now();
  const base: Omit<AgentPipelineResult, 'decision'> = {
    relationshipId,
    characterId: '',
    userId: '',
    timingAllowed: false,
    delivered: false,
    dryRun: config.dryRun,
    durationMs: 0,
  };

  // 1. ユーザー状態収集
  const state = await collectUserState(relationshipId);
  if (!state) {
    return {
      ...base,
      decision: { should: false, reason: 'state collection failed', messageType: null, urgency: 'normal' },
      skippedReason: 'state_collection_failed',
    };
  }

  base.characterId = state.characterId;
  base.userId = state.userId;

  // フォローアップ候補を取得してstateに追加
  const followUpCandidates = await getActiveFollowUps(state.characterId, state.userId);
  if (followUpCandidates.length > 0) {
    state.followUpCandidates = followUpCandidates;
  }

  // Relationship情報（TimingGuardのlastAgentDecisionAt用）
  const rel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: {
      agentLastDecisionAt: true,
      character: {
        select: { id: true, name: true, systemPrompt: true, slug: true },
      },
      user: {
        select: { id: true, nickname: true, displayName: true },
      },
    },
  });

  if (!rel) {
    return {
      ...base,
      decision: { should: false, reason: 'relationship not found', messageType: null, urgency: 'normal' },
      skippedReason: 'relationship_not_found',
    };
  }

  // 2. DecisionEngine（軽量LLM判断）
  const decision = await decideContact(rel.character, state);

  if (!decision.should) {
    // 判断記録（送信なし）
    await recordAgentDecision({
      characterId: state.characterId,
      userId: state.userId,
      relationshipId,
      decision,
    }).catch(() => {});

    return {
      ...base,
      decision,
      timingAllowed: false,
      skippedReason: 'decision_no',
    };
  }

  // 3. TimingGuard
  const timing = checkTimingGuard(state, config, rel.agentLastDecisionAt, decision.urgency);

  if (!timing.allowed) {
    await recordAgentDecision({
      characterId: state.characterId,
      userId: state.userId,
      relationshipId,
      decision,
      skippedReason: timing.reason,
    }).catch(() => {});

    return {
      ...base,
      decision,
      timingAllowed: false,
      skippedReason: timing.reason,
    };
  }

  // 4. メッセージ生成
  // DBから完全なRelationship（memorySummary含む）を取得
  const fullRel = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: {
      id: true,
      level: true,
      experiencePoints: true,
      totalMessages: true,
      lastMessageAt: true,
      firstMessageAt: true,
      memorySummary: true,
      characterEmotion: true,
      characterEmotionNote: true,
      emotionUpdatedAt: true,
      character: { select: { id: true, name: true, systemPrompt: true, slug: true } },
      user: { select: { id: true, nickname: true, displayName: true } },
    },
  });

  if (!fullRel) {
    return {
      ...base,
      decision,
      timingAllowed: true,
      skippedReason: 'relationship_not_found',
    };
  }

  const generatedMessage = await generateAgentMessage(fullRel, decision, state);

  if (!generatedMessage) {
    return {
      ...base,
      decision,
      timingAllowed: true,
      skippedReason: 'generation_failed',
    };
  }

  // 5. DRY_RUN チェック
  if (config.dryRun) {
    logger.info(`[AgentLoop][DRY_RUN] Would deliver to ${state.userName}: "${generatedMessage.slice(0, 50)}..."`);

    // DRY_RUN でも判断記録は残す
    await recordAgentDecision({
      characterId: state.characterId,
      userId: state.userId,
      relationshipId,
      decision,
      skippedReason: 'dry_run',
    }).catch(() => {});

    return {
      ...base,
      decision,
      timingAllowed: true,
      messageGenerated: generatedMessage,
      delivered: false,
      dryRun: true,
    };
  }

  // 6. 配信
  const decisionId = await recordAgentDecision({
    characterId: state.characterId,
    userId: state.userId,
    relationshipId,
    decision,
  }).catch(() => undefined);

  await deliverAgentMessage({
    relationshipId,
    characterId: state.characterId,
    userId: state.userId,
    characterName: rel.character.name,
    content: generatedMessage,
    decision,
    decisionId,
  });

  // フォローアップが配信済みの場合、最初のfollowUpをmarkAsSent
  if (
    decision.messageType === 'follow_up_concern' &&
    state.followUpCandidates &&
    state.followUpCandidates.length > 0
  ) {
    await markAsSent(state.followUpCandidates[0].id).catch(() => {});
  }

  return {
    ...base,
    decision,
    timingAllowed: true,
    messageGenerated: generatedMessage,
    delivered: true,
    dryRun: false,
  };
}

/**
 * メインエントリーポイント: エージェントループを1サイクル実行する
 */
export async function runCharacterAgentLoop(
  overrideConfig?: Partial<AgentLoopConfig>,
): Promise<AgentLoopSummary> {
  const config: AgentLoopConfig = {
    ...DEFAULT_AGENT_CONFIG,
    // 環境変数でDRY_RUNを制御（デフォルト: true）
    dryRun: process.env.AGENT_DRY_RUN !== 'false',
    ...overrideConfig,
  };

  const startTime = Date.now();

  logger.info(`[AgentLoop] Starting loop. dryRun=${config.dryRun}, maxPairs=${config.maxPairsPerRun}`);

  // 対象Relationship取得
  const relationshipIds = await getTargetRelationships(config.maxPairsPerRun);

  logger.info(`[AgentLoop] Processing ${relationshipIds.length} relationships`);

  const summary: AgentLoopSummary = {
    totalProcessed: 0,
    decided: 0,
    delivered: 0,
    skippedByTiming: 0,
    skippedByDecision: 0,
    errors: 0,
    dryRun: config.dryRun,
    durationMs: 0,
  };

  for (const relationshipId of relationshipIds) {
    if (summary.totalProcessed >= config.maxPairsPerRun) break;

    try {
      const result = await runPipelineForRelationship(relationshipId, config);
      summary.totalProcessed++;

      if (result.decision.should) {
        summary.decided++;
      } else {
        summary.skippedByDecision++;
      }

      if (!result.timingAllowed && result.decision.should) {
        summary.skippedByTiming++;
        summary.skippedByDecision--; // 判断はYesだがタイミングでスキップ
      }

      if (result.delivered) {
        summary.delivered++;
      }

      logger.info(
        `[AgentLoop] Processed ${relationshipId}: ` +
        `should=${result.decision.should}, ` +
        `timingOk=${result.timingAllowed}, ` +
        `delivered=${result.delivered}, ` +
        `skip=${result.skippedReason ?? 'none'}`
      );
    } catch (error) {
      summary.errors++;
      summary.totalProcessed++;
      logger.error(`[AgentLoop] Error processing relationship ${relationshipId}:`, error);
      // エラーは個別スキップ（全体を止めない）
    }

    // レート制限対策: 各ペアの処理間に少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  summary.durationMs = Date.now() - startTime;

  logger.info(
    `[AgentLoop] Complete. ` +
    `processed=${summary.totalProcessed}, ` +
    `decided=${summary.decided}, ` +
    `delivered=${summary.delivered}, ` +
    `skippedTiming=${summary.skippedByTiming}, ` +
    `skippedDecision=${summary.skippedByDecision}, ` +
    `errors=${summary.errors}, ` +
    `dryRun=${summary.dryRun}, ` +
    `duration=${summary.durationMs}ms`
  );

  return summary;
}
