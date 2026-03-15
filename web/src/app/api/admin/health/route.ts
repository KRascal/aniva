/**
 * GET /api/admin/health — システムヘルスチェック
 * super_admin専用
 * 
 * レスポンス:
 *   - db: DB接続状態
 *   - responseTimeMs: /api/health の応答時間
 *   - memory: プロセスメモリ使用量
 *   - uptime: Node.jsプロセス起動時間（秒）
 *   - timestamp: チェック実行時刻
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import os from 'os';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results: Record<string, unknown> = {};

    // DB接続チェック
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.db = { status: 'ok', responseTimeMs: Date.now() - dbStart };
    } catch (e) {
      results.db = { status: 'error', error: String(e), responseTimeMs: Date.now() - dbStart };
    }

    // /api/health の応答速度チェック
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const healthStart = Date.now();
    let healthData: unknown = null;
    try {
      const resp = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      healthData = await resp.json();
      results.health = {
        status: resp.ok ? 'ok' : 'error',
        httpStatus: resp.status,
        responseTimeMs: Date.now() - healthStart,
        data: healthData,
      };
    } catch (e) {
      results.health = {
        status: 'error',
        error: String(e),
        responseTimeMs: Date.now() - healthStart,
      };
    }

    // メモリ使用量
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    results.memory = {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      systemTotalMB: Math.round(totalMem / 1024 / 1024),
      systemFreeMB: Math.round(freeMem / 1024 / 1024),
      systemUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    };

    // CPU情報
    results.cpu = {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model ?? 'unknown',
      loadAvg: os.loadavg(),
    };

    // プロセス稼働時間
    results.uptime = {
      processSeconds: Math.round(process.uptime()),
      systemSeconds: Math.round(os.uptime()),
    };

    // Redis接続チェック（簡易）
    try {
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 2000,
      });
      const redisStart = Date.now();
      await redis.ping();
      results.redis = { status: 'ok', responseTimeMs: Date.now() - redisStart };
      await redis.quit();
    } catch (e) {
      results.redis = { status: 'error', error: String(e) };
    }

    results.timestamp = new Date().toISOString();

    logger.info('Admin: health check', { adminId: ctx.userId });

    return NextResponse.json(results);
  } catch (error) {
    logger.error('GET /api/admin/health error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
