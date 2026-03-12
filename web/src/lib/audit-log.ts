/**
 * 監査ログ — 課金・重要アクションの記録
 * 
 * ファイルベース + DB記録のハイブリッド
 * 使い方: auditLog('coin_purchase', { userId, amount, packageId })
 */
import { appendFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '@/lib/logger';

const LOG_DIR = process.env.AUDIT_LOG_DIR || '/home/openclaw/.openclaw/workspace/logs'

interface AuditEntry {
  timestamp: string
  action: string
  userId?: string
  ip?: string
  details: Record<string, unknown>
}

export async function auditLog(
  action: string,
  details: Record<string, unknown>,
  options?: { userId?: string; ip?: string }
) {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId: options?.userId,
    ip: options?.ip,
    details,
  }

  const line = JSON.stringify(entry) + '\n'

  try {
    const logFile = join(LOG_DIR, 'aniva-audit.jsonl')
    await appendFile(logFile, line, 'utf-8')
  } catch {
    // ファイル書き込み失敗時はconsole.logにフォールバック
    logger.info('[AUDIT]', { line })
  }
}

// ── Admin操作用ヘルパー ──

/**
 * admin操作の監査ログを記録する便利関数
 * 使い方: adminAudit('character_update', adminEmail, { characterId, changes })
 */
export async function adminAudit(
  action: string,
  adminEmail: string,
  details: Record<string, unknown>,
  options?: { ip?: string }
) {
  await auditLog(`admin.${action}`, {
    adminEmail,
    ...details,
  }, {
    userId: adminEmail,
    ip: options?.ip,
  })
}

// ── プリセット ──

export const AUDIT_ACTIONS = {
  COIN_PURCHASE: 'coin_purchase',
  COIN_SPEND: 'coin_spend',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  GACHA_PULL: 'gacha_pull',
  ADMIN_ACTION: 'admin_action',
  LOGIN: 'login',
  WEBHOOK_RECEIVED: 'webhook_received',
  WEBHOOK_FAILED: 'webhook_failed',
} as const

export const ADMIN_AUDIT_ACTIONS = {
  // キャラクター
  CHARACTER_CREATE: 'character_create',
  CHARACTER_UPDATE: 'character_update',
  CHARACTER_DELETE: 'character_delete',
  CHARACTER_TOGGLE_ACTIVE: 'character_toggle_active',
  CHARACTER_EMERGENCY_STOP: 'character_emergency_stop',
  CHARACTER_SOUL_UPDATE: 'character_soul_update',
  CHARACTER_BOUNDARY_UPDATE: 'character_boundary_update',
  CHARACTER_VOICE_UPDATE: 'character_voice_update',
  CHARACTER_PRESENCE_UPDATE: 'character_presence_update',
  // コンテンツ
  MOMENT_CREATE: 'moment_create',
  MOMENT_DELETE: 'moment_delete',
  SCENARIO_CREATE: 'scenario_create',
  SCENARIO_UPDATE: 'scenario_update',
  SCENARIO_DELETE: 'scenario_delete',
  STORY_CREATE: 'story_create',
  STORY_UPDATE: 'story_update',
  STORY_DELETE: 'story_delete',
  LETTER_CREATE: 'letter_create',
  POLL_CREATE: 'poll_create',
  DLC_CREATE: 'dlc_create',
  DLC_UPDATE: 'dlc_update',
  DLC_DELETE: 'dlc_delete',
  LORE_CREATE: 'lore_create',
  LORE_UPDATE: 'lore_update',
  LORE_DELETE: 'lore_delete',
  // コマース
  GACHA_CARD_CREATE: 'gacha_card_create',
  GACHA_CARD_UPDATE: 'gacha_card_update',
  GACHA_CARD_DELETE: 'gacha_card_delete',
  GACHA_BANNER_CREATE: 'gacha_banner_create',
  GACHA_BANNER_UPDATE: 'gacha_banner_update',
  GACHA_BANNER_DELETE: 'gacha_banner_delete',
  SHOP_ITEM_CREATE: 'shop_item_create',
  SHOP_ITEM_UPDATE: 'shop_item_update',
  SHOP_ITEM_DELETE: 'shop_item_delete',
  COIN_PACKAGE_CREATE: 'coin_package_create',
  COIN_PACKAGE_UPDATE: 'coin_package_update',
  COIN_PACKAGE_DELETE: 'coin_package_delete',
  // ユーザー操作
  USER_COIN_GRANT: 'user_coin_grant',
  USER_PLAN_CHANGE: 'user_plan_change',
  // 通知
  NOTIFICATION_SEND: 'notification_send',
  // フィードバック
  FEEDBACK_STATUS_UPDATE: 'feedback_status_update',
} as const
