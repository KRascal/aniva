/**
 * 監査ログ — 課金・重要アクションの記録
 * 
 * ファイルベース + DB記録のハイブリッド
 * 使い方: auditLog('coin_purchase', { userId, amount, packageId })
 */
import { appendFile } from 'fs/promises'
import { join } from 'path'

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
    console.log('[AUDIT]', line)
  }
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
