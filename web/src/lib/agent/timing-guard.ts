/**
 * TimingGuard — 送信前の最終ガード判定
 * 深夜・連投・未読・デイリー上限をチェック
 */

import type { UserStateSnapshot, AgentLoopConfig, TimingGuardResult } from './types';
import { DEFAULT_AGENT_CONFIG } from './types';

export function checkTimingGuard(
  state: UserStateSnapshot,
  config: AgentLoopConfig = DEFAULT_AGENT_CONFIG,
  lastAgentDecisionAt: Date | null = null,
  urgency: 'low' | 'normal' | 'high' = 'normal',
): TimingGuardResult {

  // 1. 深夜チェック（urgency: high は除外）
  if (urgency !== 'high') {
    const hour = state.currentHourJST;
    if (hour >= config.quietHoursStart || hour < config.quietHoursEnd) {
      return { allowed: false, reason: 'late_night' };
    }
  }

  // 2. 未読メッセージが多い → スキップ
  if (state.unreadMessageCount >= config.maxUnreadBeforeSkip) {
    return { allowed: false, reason: 'unread_pending' };
  }

  // 3. デイリー上限
  if (state.agentContactCountToday >= config.dailyContactLimit) {
    return { allowed: false, reason: 'daily_limit' };
  }

  // 4. 最小インターバル（最後のエージェント送信から一定時間経過していない）
  if (lastAgentDecisionAt) {
    const hoursSinceLast = (Date.now() - lastAgentDecisionAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < config.minIntervalHours) {
      return { allowed: false, reason: 'too_soon' };
    }
  }

  return { allowed: true };
}
