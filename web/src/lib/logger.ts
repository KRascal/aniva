/**
 * Structured Logger for ANIVA
 * 
 * Replaces raw console.log/error/warn with structured JSON output.
 * In production, these can be piped to external log aggregators.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Payment failed', { error, characterId });
 *   logger.warn('Rate limit approaching', { remaining: 5 });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    };
  }
  return { error: String(err) };
}

function emit(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  emit({
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  });
}

function normalizeData(dataOrError?: unknown): Record<string, unknown> | undefined {
  if (dataOrError === undefined) return undefined;
  if (dataOrError instanceof Error) return formatError(dataOrError);
  if (typeof dataOrError === 'object' && dataOrError !== null && !Array.isArray(dataOrError)) {
    return dataOrError as Record<string, unknown>;
  }
  return { value: dataOrError };
}

export const logger = {
  debug: (message: string, data?: unknown) => log('debug', message, normalizeData(data)),
  info: (message: string, data?: unknown) => log('info', message, normalizeData(data)),
  warn: (message: string, data?: unknown) => log('warn', message, normalizeData(data)),
  error: (message: string, errorOrData?: unknown, extraData?: Record<string, unknown>) => {
    const data = { ...normalizeData(errorOrData), ...extraData };
    log('error', message, data);
  },
};
