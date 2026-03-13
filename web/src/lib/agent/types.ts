/**
 * Character Agent Phase 1 — 型定義
 * キャラクターを「自律エージェント」として動作させるための型
 */

export interface UserStateSnapshot {
  userId: string;
  characterId: string;
  relationshipId: string;

  // 不在情報
  daysSinceLastLogin: number;
  daysSinceLastMessage: number;

  // 未読
  unreadMessageCount: number;

  // 感情・悩み
  recentEmotions: string[];
  activeConcerns: string[];

  // 生活パターン
  lifePattern: { peakHours: number[] };
  currentHourJST: number;

  // 直近の会話トピック
  recentTopics: string[];

  // キャラの感情状態
  characterEmotionContext: string;

  // 今日のエージェント接触数
  agentContactCountToday: number;

  // ユーザー名
  userName: string;

  // 関係レベル
  relationshipLevel: number;
}

export type MessageType =
  | 'check_in'
  | 'miss_you'
  | 'share_thought'
  | 'follow_up_concern'
  | 'celebrate'
  | 'initiate_topic';

export interface AgentDecision {
  should: boolean;
  reason: string;
  messageType: MessageType | null;
  urgency: 'low' | 'normal' | 'high';
}

export interface TimingGuardResult {
  allowed: boolean;
  reason?: string;
}

export interface AgentPipelineResult {
  relationshipId: string;
  characterId: string;
  userId: string;
  decision: AgentDecision;
  timingAllowed: boolean;
  skippedReason?: string;
  messageGenerated?: string;
  delivered: boolean;
  dryRun: boolean;
}

export interface AgentLoopConfig {
  dryRun: boolean;
  maxPairsPerRun: number;
  dailyContactLimit: number;
  minIntervalHours: number;
  quietHoursStart: number; // JST hour
  quietHoursEnd: number;   // JST hour
  maxUnreadBeforeSkip: number;
}

export const DEFAULT_AGENT_CONFIG: AgentLoopConfig = {
  dryRun: true, // Phase 1a: ログのみ
  maxPairsPerRun: 50,
  dailyContactLimit: 2,
  minIntervalHours: 3,
  quietHoursStart: 23,
  quietHoursEnd: 6,
  maxUnreadBeforeSkip: 2,
};
