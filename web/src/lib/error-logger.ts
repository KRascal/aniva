/**
 * Error Logger — Sentry代替の最低限エラー集約
 * Sentry DSNが設定されるまでの間、ファイルベースでエラーを記録
 */

import { appendFile } from 'fs/promises';

const LOG_PATH = process.env.ERROR_LOG_PATH || '/tmp/aniva-errors.jsonl';
const MAX_CONTEXT_LENGTH = 500;

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
 * エラーをJSONL形式でログファイルに追記
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
      userId: context?.userId ? `u_${context.userId.slice(-6)}` : undefined, // PII除外: 末尾6文字のみ
      context: context?.extra,
    };

    await appendFile(LOG_PATH, JSON.stringify(entry) + '\n');
  } catch {
    // ログ書き込み自体が失敗しても本体には影響させない
    console.error('[error-logger] Failed to write error log');
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
