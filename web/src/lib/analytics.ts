/**
 * ANIVA Analytics — 全イベント定義 + 計測ヘルパー
 *
 * 使い方:
 *   import { track, identify } from '@/lib/analytics'
 *   track('chat_message_sent', { characterId: 'luffy', messageLength: 42 })
 */
import { posthog } from './posthog'

// ── イベント名定義 ──
export const EVENTS = {
  // オンボーディング
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_STEP: 'onboarding_step',

  // チャット
  CHAT_OPENED: 'chat_opened',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_SESSION_ENDED: 'chat_session_ended',
  VOICE_CALL_STARTED: 'voice_call_started',
  VOICE_CALL_ENDED: 'voice_call_ended',
  STICKER_SENT: 'sticker_sent',
  IMAGE_SENT: 'image_sent',

  // キャラクター
  CHARACTER_FOLLOWED: 'character_followed',
  CHARACTER_UNFOLLOWED: 'character_unfollowed',
  CHARACTER_PROFILE_VIEWED: 'character_profile_viewed',

  // タイムライン / ソーシャル
  MOMENT_VIEWED: 'moment_viewed',
  MOMENT_LIKED: 'moment_liked',
  MOMENT_COMMENTED: 'moment_commented',
  STORY_VIEWED: 'story_viewed',
  STORY_CHAT_STARTED: 'story_chat_started',

  // ガチャ / コイン
  GACHA_PULLED: 'gacha_pulled',
  COIN_PURCHASED: 'coin_purchased',
  COIN_SPENT: 'coin_spent',
  DAILY_BONUS_CLAIMED: 'daily_bonus_claimed',

  // エンゲージメント
  STREAK_CONTINUED: 'streak_continued',
  STREAK_BROKEN: 'streak_broken',
  STREAK_RECOVERED: 'streak_recovered',
  MISSION_COMPLETED: 'mission_completed',
  TUTORIAL_STEP: 'tutorial_step',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  TUTORIAL_SKIPPED: 'tutorial_skipped',

  // 通知
  PUSH_NOTIFICATION_SUBSCRIBED: 'push_notification_subscribed',
  NOTIFICATION_CLICKED: 'notification_clicked',

  // 課金
  PRICING_VIEWED: 'pricing_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_CREATED: 'subscription_created',

  // ナビゲーション
  TAB_SWITCHED: 'tab_switched',
  DISCOVER_VIEWED: 'discover_viewed',
  TINDER_SWIPE: 'tinder_swipe',

  // ファネル分析 (KPI計測用)
  FIRST_CHAT_SENT: 'first_chat_sent',           // 初回メッセージ送信
  SECOND_SESSION_CHAT: 'second_session_chat',    // 2回目セッションでチャット
  FC_CTA_CLICKED: 'fc_cta_clicked',             // FC加入CTA表示→クリック
  FC_CHECKOUT_COMPLETED: 'fc_checkout_completed', // FC決済完了
  RETENTION_DAY1: 'retention_day1',              // 翌日リテンション
  RETENTION_DAY7: 'retention_day7',              // 7日リテンション

  // エラー/UX問題検知
  API_ERROR: 'api_error',                        // APIエラー発生
  PAGE_ERROR: 'page_error',                      // error boundary発動
  SLOW_RESPONSE: 'slow_response',                // AI応答3秒以上

  // オフライン
  OFFLINE_DETECTED: 'offline_detected',
  ONLINE_RESTORED: 'online_restored',
} as const

type EventName = (typeof EVENTS)[keyof typeof EVENTS]

// ── ヘルパー ──

export function track(event: EventName, properties?: Record<string, unknown>) {
  try {
    posthog.capture(event, properties)
  } catch {
    // PostHog未初期化時は静かに無視
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  try {
    posthog.identify(userId, traits)
  } catch {
    // ignore
  }
}

export function resetUser() {
  try {
    posthog.reset()
  } catch {
    // ignore
  }
}

/** ページビュー（SPAルーティング用） */
export function trackPageView(url?: string) {
  try {
    posthog.capture('$pageview', url ? { $current_url: url } : undefined)
  } catch {
    // ignore
  }
}
