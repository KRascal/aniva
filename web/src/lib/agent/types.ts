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

// ── 設定定数 ────────────────────────────────────────────────

export const AGENT_CONFIG = {
  /** 1回のcron実行で処理する最大ペア数 */
  MAX_PAIRS_PER_RUN: 50,

  /** 1日にキャラ→ユーザーに送れる最大数 */
  DAILY_CONTACT_LIMIT: 2,

  /** エージェント送信の最小インターバル（時間） */
  MIN_INTERVAL_HOURS: 3,

  /** 深夜時間帯（JST）— この時間帯はurgency:high以外ブロック */
  LATE_NIGHT_START: 23,
  LATE_NIGHT_END: 6,

  /** 未読がこの数以上ならスキップ */
  MAX_UNREAD_BEFORE_SKIP: 2,

  /** 1ペアあたりの処理タイムアウト（ms） */
  PER_PAIR_TIMEOUT_MS: 25_000,

  /** 判断用軽量モデル */
  DECISION_MODEL: 'grok-3-mini',

  /** 生成用重量モデル */
  GENERATION_MODEL: 'grok-3',
} as const;
