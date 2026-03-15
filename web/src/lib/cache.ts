/**
 * Redis Cache Layer — 高頻度DBクエリのキャッシュ
 * 
 * 使い方:
 *   const char = await cached('char:abc', 600, () => prisma.character.findUnique(...))
 *   await invalidate('char:*')  // パターン指定で一括無効化
 * 
 * 設計方針:
 *   - Redis障害時はDB直読みにフォールバック（可用性優先）
 *   - rate-limit.ts と同じRedis接続を共有
 *   - JSON serialize/deserialize（Date型はstring化される点に注意）
 */

import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
      keyPrefix: 'aniva:',
    });
    redis.on('error', () => {
      // Redis接続失敗は静かに無視（フォールバックで対応）
    });
  }
  return redis;
}

/**
 * キャッシュ付きデータ取得
 * @param key キャッシュキー
 * @param ttlSec 有効期間（秒）
 * @param fetcher データ取得関数
 */
export async function cached<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const r = getRedis();
    const hit = await r.get(key);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch {
    // Redis障害時はスキップ
  }

  const data = await fetcher();

  try {
    const r = getRedis();
    await r.setex(key, ttlSec, JSON.stringify(data));
  } catch {
    // 書き込み失敗は無視
  }

  return data;
}

/**
 * パターン指定でキャッシュを無効化
 * @param pattern glob パターン（例: 'char:*', 'user:abc'）
 * 注意: keyPrefix 'aniva:' は自動付与されるため、pattern には含めない
 */
export async function invalidate(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    // SCAN でキーを取得（KEYS コマンドはブロッキングなので避ける）
    const stream = r.scanStream({ match: pattern, count: 100 });
    const keysToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        // scanStream は keyPrefix を含んだフルキーを返すため、
        // del するときもフルキーのままでOK（ioredis が prefix を付けない）
        keysToDelete.push(...keys);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keysToDelete.length > 0) {
      // keyPrefix付きなのでsendCommandで直接delする
      const pipeline = r.pipeline();
      for (const key of keysToDelete) {
        // scanStreamはprefixなしのキー名を返す
        pipeline.del(key);
      }
      await pipeline.exec();
      logger.info(`[cache] Invalidated ${keysToDelete.length} keys matching "${pattern}"`);
    }
  } catch (error) {
    logger.warn('[cache] Invalidation failed:', error);
  }
}

/**
 * 特定キーのキャッシュを削除
 */
export async function invalidateKey(key: string): Promise<void> {
  try {
    const r = getRedis();
    await r.del(key);
  } catch {
    // 無視
  }
}

// ── キャッシュキー生成ヘルパー ──

export const CacheKeys = {
  /** キャラクタープロフィール */
  character: (id: string) => `char:${id}`,
  /** キャラクターSOUL/プロンプト */
  characterSoul: (id: string) => `char-soul:${id}`,
  /** キャラクター一覧 */
  characterList: () => 'char-list',
  /** ユーザーコイン残高 */
  coinBalance: (userId: string) => `coins:${userId}`,
  /** キャラランキング */
  ranking: (type: string) => `ranking:${type}`,
} as const;

// ── TTL定数 ──

export const CacheTTL = {
  /** キャラクタープロフィール: 10分 */
  CHARACTER: 600,
  /** キャラクターSOUL: 30分 */
  CHARACTER_SOUL: 1800,
  /** キャラ一覧: 5分 */
  CHARACTER_LIST: 300,
  /** コイン残高: 1分（整合性重視） */
  COIN_BALANCE: 60,
  /** ランキング: 5分 */
  RANKING: 300,
} as const;
