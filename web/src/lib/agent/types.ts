/**
 * Character Agent Types — Phase 1
 *
 * キャラクターが「自分の意志で」ユーザーに連絡する判断エンジンの型定義。
 * cronベースの確率送信から、LLM判断ベースの意図的送信への移行。
 */

// ── メッセージタイプ ──────────────────────────────────────────

export type MessageType =
  | 'check_in'           // 元気？系
  | 'miss_you'           // 久しぶり系
  | 'share_thought'      // キャラが思ったことをシェア
  | 'follow_up_concern'  // 以前の悩みへのフォローアップ
  | 'celebrate'          // 何かめでたいことへの祝福
  | 'initiate_topic';    // 新しい話題を振る

export type Urgency = 'low' | 'normal' | 'high';

// ── ユーザー状態スナップショット ───────────────────────────────

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

  // 関係性レベル
  relationshipLevel: number;
  totalMessages: number;
  streakDays: number;

  // ユーザー名（表示・プロンプト用）
  userName: string;
}

// ── エージェント判断結果 ──────────────────────────────────────

export interface AgentDecision {
  should: boolean;
  reason: string;
  messageType: MessageType | null;
  urgency: Urgency;
}

// ── タイミングガード結果 ──────────────────────────────────────

export interface TimingGuardResult {
  allowed: boolean;
  reason?: string;
}

// ── パイプライン実行結果 ──────────────────────────────────────

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
  durationMs: number;
}

// ── ループ実行サマリー ───────────────────────────────────────

export interface AgentLoopSummary {
  startedAt: string;
  completedAt: string;
  totalPairsProcessed: number;
  decisionsToContact: number;
  messagesDelivered: number;
  skippedByTiming: number;
  errors: number;
  dryRun: boolean;
  results: AgentPipelineResult[];
}

// ── エージェントループ設定 ───────────────────────────────────

export interface AgentLoopConfig {
  /** 1回のcron実行で処理する最大ペア数 */
  maxPairsPerRun: number;

  /** 1日にキャラ→ユーザーに送れる最大数 */
  dailyContactLimit: number;

  /** エージェント送信の最小インターバル（時間） */
  minIntervalHours: number;

  /** 深夜開始時間（JST）— この時間帯はurgency:high以外ブロック */
  quietHoursStart: number;

  /** 深夜終了時間（JST） */
  quietHoursEnd: number;

  /** 未読がこの数以上ならスキップ */
  maxUnreadBeforeSkip: number;

  /** 1ペアあたりの処理タイムアウト（ms） */
  perPairTimeoutMs: number;

  /** DRY_RUNモード: trueなら送信せずログのみ */
  dryRun: boolean;

  /** 判断用軽量モデル */
  decisionModel: string;

  /** 生成用重量モデル */
  generationModel: string;
}

export const DEFAULT_AGENT_CONFIG: AgentLoopConfig = {
  maxPairsPerRun: 50,
  dailyContactLimit: 2,
  minIntervalHours: 3,
  quietHoursStart: 23,
  quietHoursEnd: 6,
  maxUnreadBeforeSkip: 2,
  perPairTimeoutMs: 25_000,
  dryRun: process.env.AGENT_DRY_RUN === 'true',
  decisionModel: 'grok-3-mini',
  generationModel: 'grok-3',
};

// ── 後方互換エイリアス ────────────────────────────────────────

/** @deprecated USE DEFAULT_AGENT_CONFIG instead */
export const AGENT_CONFIG = {
  MAX_PAIRS_PER_RUN: DEFAULT_AGENT_CONFIG.maxPairsPerRun,
  DAILY_CONTACT_LIMIT: DEFAULT_AGENT_CONFIG.dailyContactLimit,
  MIN_INTERVAL_HOURS: DEFAULT_AGENT_CONFIG.minIntervalHours,
  LATE_NIGHT_START: DEFAULT_AGENT_CONFIG.quietHoursStart,
  LATE_NIGHT_END: DEFAULT_AGENT_CONFIG.quietHoursEnd,
  MAX_UNREAD_BEFORE_SKIP: DEFAULT_AGENT_CONFIG.maxUnreadBeforeSkip,
  PER_PAIR_TIMEOUT_MS: DEFAULT_AGENT_CONFIG.perPairTimeoutMs,
  DECISION_MODEL: DEFAULT_AGENT_CONFIG.decisionModel,
  GENERATION_MODEL: DEFAULT_AGENT_CONFIG.generationModel,
} as const;
