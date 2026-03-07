/**
 * Rate Limiter — Redis-backed (localhost:6379)
 * 
 * 使い方:
 *   const limiter = createRateLimiter({ prefix: 'chat', limit: 20, windowSec: 60 })
 *   const { success, remaining } = await limiter.check(userId)
 */
import Redis from 'ioredis'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    })
    redis.on('error', () => {
      // Redis接続失敗時は静かに無視（rate limitをスキップ）
    })
  }
  return redis
}

interface RateLimitConfig {
  prefix: string
  limit: number       // リクエスト上限
  windowSec: number   // ウィンドウ（秒）
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number     // Unix timestamp (ms)
}

export function createRateLimiter(config: RateLimitConfig) {
  return {
    async check(identifier: string): Promise<RateLimitResult> {
      try {
        const r = getRedis()
        const key = `rl:${config.prefix}:${identifier}`
        const now = Math.floor(Date.now() / 1000)
        const windowStart = now - config.windowSec

        // Sliding window: sorted set with timestamps
        const pipeline = r.pipeline()
        pipeline.zremrangebyscore(key, 0, windowStart)
        pipeline.zadd(key, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`)
        pipeline.zcard(key)
        pipeline.expire(key, config.windowSec + 1)

        const results = await pipeline.exec()
        const count = (results?.[2]?.[1] as number) || 0

        if (count > config.limit) {
          // 超過: 最後に追加したエントリを削除
          await r.zremrangebyscore(key, now, now)
          return {
            success: false,
            remaining: 0,
            resetAt: (now + config.windowSec) * 1000,
          }
        }

        return {
          success: true,
          remaining: config.limit - count,
          resetAt: (now + config.windowSec) * 1000,
        }
      } catch {
        // Redis障害時はrate limitをスキップ（可用性優先）
        return { success: true, remaining: config.limit, resetAt: Date.now() + config.windowSec * 1000 }
      }
    },
  }
}

// ── プリセット ──

/** チャット: 20メッセージ/分 */
export const chatLimiter = createRateLimiter({ prefix: 'chat', limit: 20, windowSec: 60 })

/** ガチャ: 10回/分 */
export const gachaLimiter = createRateLimiter({ prefix: 'gacha', limit: 10, windowSec: 60 })

/** 認証: 5回/分 */
export const authLimiter = createRateLimiter({ prefix: 'auth', limit: 5, windowSec: 60 })

/** API汎用: 60回/分 */
export const apiLimiter = createRateLimiter({ prefix: 'api', limit: 60, windowSec: 60 })

/** 課金: 5回/分 */
export const paymentLimiter = createRateLimiter({ prefix: 'payment', limit: 5, windowSec: 60 })

/**
 * 後方互換ヘルパー: checkRateLimit(identifier, limit, windowMs)
 * 旧APIとの互換性を維持するためのラッパー
 * @deprecated createRateLimiter() を直接使用することを推奨
 */
export async function checkRateLimit(identifier: string, limit: number, windowMs: number) {
  const prefix = identifier.split(':')[0]
  const limiter = createRateLimiter({ prefix, limit, windowSec: Math.floor(windowMs / 1000) })
  const result = await limiter.check(identifier)
  return { allowed: result.success, resetAt: result.resetAt, remaining: result.remaining }
}

/** ヘルパー: rate limit超過レスポンス */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
      },
    }
  )
}
