/**
 * Redis Cache — cache-aside pattern
 *
 * rate-limit.ts と同じRedis接続先を使用（localhost:6379）。
 * 高頻度APIのDBクエリ結果をキャッシュし、100同時接続時のDB負荷を軽減する。
 */
import Redis from 'ioredis';

let cacheRedis: Redis | null = null;

function getCacheRedis(): Redis {
  if (!cacheRedis) {
    cacheRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
      keyPrefix: 'cache:',
    });
    cacheRedis.on('error', () => {
      // Redis接続失敗時はキャッシュをスキップ（可用性優先）
    });
  }
  return cacheRedis;
}

/**
 * Cache-aside パターン: キャッシュがあれば返し、なければ fetchFn を実行してキャッシュに保存
 *
 * @param key - キャッシュキー（自動的に "cache:" プレフィックスが付く）
 * @param ttlSeconds - TTL（秒）
 * @param fetchFn - キャッシュミス時に実行する関数
 * @returns fetchFn の結果（キャッシュヒット時はキャッシュから復元）
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  try {
    const redis = getCacheRedis();
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis障害時はfallthrough
  }

  const data = await fetchFn();

  try {
    const redis = getCacheRedis();
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // キャッシュ書き込み失敗は無視
  }

  return data;
}

/**
 * キャッシュを破棄する（admin操作時に使用）
 *
 * @param key - 単一キーまたはワイルドカードパターン（例: "characters:*"）
 */
export async function cacheInvalidate(key: string): Promise<void> {
  try {
    const redis = getCacheRedis();
    if (key.includes('*')) {
      // ワイルドカード: SCAN で該当キーを見つけて削除
      // keyPrefix が "cache:" なので、SCAN 時にはそのまま渡す
      const stream = redis.scanStream({ match: key, count: 100 });
      const pipeline = redis.pipeline();
      let count = 0;
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          for (const k of keys) {
            // keyPrefix が自動付与されるため、プレフィックスを除去してdelに渡す
            const unprefixed = k.startsWith('cache:') ? k.slice(6) : k;
            pipeline.del(unprefixed);
            count++;
          }
        });
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });
      if (count > 0) {
        await pipeline.exec();
      }
    } else {
      await redis.del(key);
    }
  } catch {
    // キャッシュ削除失敗は無視（次回TTL切れで自然解消）
  }
}

// ── キャッシュキー定数 ──

export const CACHE_KEYS = {
  /** キャラ一覧（フィルタなし） */
  CHARACTERS_LIST: 'characters:list',
  /** キャラ一覧（検索クエリ付き） */
  charactersSearch: (q: string) => `characters:search:${q.toLowerCase().trim()}`,
  /** ガチャバナー一覧 */
  GACHA_BANNERS: 'gacha:banners',
  /** ランキング（type+period） */
  ranking: (type: string, period: string) => `ranking:${type}:${period}`,
  /** コインパッケージ一覧 */
  COIN_PACKAGES: 'coins:packages',
} as const;

// ── TTL定数（秒） ──

export const CACHE_TTL = {
  CHARACTERS: 300,      // 5分
  GACHA_BANNERS: 300,   // 5分
  RANKING: 600,         // 10分
  COIN_PACKAGES: 3600,  // 1時間
} as const;
