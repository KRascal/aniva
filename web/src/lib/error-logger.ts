/**
 * Error Logger — エラー集約 + Slack通知
 * 本番運用に必要な即時アラートを実現
 */

import { appendFile } from 'fs/promises';
import { logger } from '@/lib/logger';

const LOG_PATH = process.env.ERROR_LOG_PATH || '/tmp/aniva-errors.jsonl';
const MAX_CONTEXT_LENGTH = 500;
const SLACK_WEBHOOK_URL = process.env.ERROR_SLACK_WEBHOOK_URL;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 同じエラーの連続通知を防ぐ（5分間デデュプ）
const recentErrors = new Map<string, number>();
const DEDUP_MS = 5 * 60 * 1000;

interface ErrorEntry {
  timestamp: string;
  level: 'error' | 'warn';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  route?: string;
  userId?: string;
}

/**
 * Slackにエラー通知
 */
async function notifySlack(entry: ErrorEntry): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;

  // デデュプチェック
  const key = `${entry.route}:${entry.message.slice(0, 100)}`;
  const lastSent = recentErrors.get(key);
  if (lastSent && Date.now() - lastSent < DEDUP_MS) return;
  recentErrors.set(key, Date.now());

  // 古いエントリをクリーンアップ
  if (recentErrors.size > 100) {
    const cutoff = Date.now() - DEDUP_MS;
    for (const [k, v] of recentErrors) {
      if (v < cutoff) recentErrors.delete(k);
    }
  }

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *ANIVA Error* ${IS_PRODUCTION ? '(PROD)' : '(STAGING)'}\n*Route:* \`${entry.route || 'unknown'}\`\n*Error:* ${entry.message.slice(0, 300)}\n*Time:* ${entry.timestamp}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Slack通知失敗は無視
  }
}

/**
 * エラーをJSONL形式でログファイルに追記 + Slack通知
 */
export async function logError(
  error: unknown,
  context?: { route?: string; userId?: string; extra?: Record<string, unknown> },
): Promise<void> {
  try {
    const entry: ErrorEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, MAX_CONTEXT_LENGTH) : undefined,
      route: context?.route,
      userId: context?.userId ? `u_${context.userId.slice(-6)}` : undefined,
      context: context?.extra,
    };

    // ファイルログ
    await appendFile(LOG_PATH, JSON.stringify(entry) + '\n');

    // Slack通知（本番 or 重大エラーのみ）
    if (IS_PRODUCTION || entry.message.includes('FATAL')) {
      await notifySlack(entry);
    }
  } catch {
    logger.error('[error-logger] Failed to write error log');
  }
}

/**
 * API routeのエラーハンドリング用ラッパー
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  route: string,
  handler: T,
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      await logError(error, { route });
      throw error;
    }
  }) as T;
}
