/**
 * シンプルなインメモリ Rate Limiter
 * サーバー再起動でリセットされる（本番では Redis 推奨）
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms
}

const store = new Map<string, RateLimitEntry>();

/**
 * レート制限チェック
 * @param key       識別キー（例: "chat:userId"）
 * @param limit     windowMs 内の最大リクエスト数
 * @param windowMs  ウィンドウ幅（ミリ秒）。デフォルト60秒
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

// 定期的に期限切れエントリを掃除（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60_000); // 5分ごと
