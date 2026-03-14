/**
 * rate-limit-edge.ts — Edge Runtime 対応 in-memory レート制限
 * 
 * proxy.ts（Next.js middleware）から使用。Redis不要。
 * 全APIリクエストへの一括防御レイヤー。
 * 
 * 個別APIのwithGuard() + Redis限はそのまま残る（二重防御）。
 * この層は「明らかな攻撃・連打」を弾く第一防衛線。
 * 
 * 制約:
 * - Edge Runtimeはステートレスだが、同一isolate内ではMapが保持される
 * - PM2 cluster mode (instances:2) ではインスタンスごとに独立カウント
 *   → 実効上限は設定値の2倍になるが、DDoS防御には十分
 * - メモリ管理: 60秒ごとに古いエントリをGC
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms
}

// ── グローバルストア（isolate内で共有） ──
const store = new Map<string, RateLimitEntry>();
let lastGC = Date.now();
const GC_INTERVAL_MS = 60_000;

/**
 * エントリのGC — 期限切れを一括削除
 */
function gc(): void {
  const now = Date.now();
  if (now - lastGC < GC_INTERVAL_MS) return;
  lastGC = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * APIパスパターンに応じたレート制限設定
 */
interface RateLimitTier {
  limit: number;       // ウィンドウ内の最大リクエスト数
  windowMs: number;    // ウィンドウ幅（ミリ秒）
}

const TIERS: Record<string, RateLimitTier> = {
  // 課金・認証系（厳しめ）
  payment:  { limit: 10,  windowMs: 60_000 },
  auth:     { limit: 10,  windowMs: 60_000 },
  // チャット・対話系
  chat:     { limit: 30,  windowMs: 60_000 },
  // ガチャ
  gacha:    { limit: 15,  windowMs: 60_000 },
  // 管理画面
  admin:    { limit: 60,  windowMs: 60_000 },
  // cron（内部呼び出し）
  cron:     { limit: 120, windowMs: 60_000 },
  // 汎用API
  default:  { limit: 60,  windowMs: 60_000 },
};

/**
 * パスからティアを判定
 */
function resolveTier(pathname: string): RateLimitTier {
  if (pathname.startsWith('/api/cron'))    return TIERS.cron;
  if (pathname.startsWith('/api/admin'))   return TIERS.admin;
  if (pathname.startsWith('/api/auth'))    return TIERS.auth;
  if (pathname.startsWith('/api/coins') || 
      pathname.startsWith('/api/fc/subscribe') ||
      pathname.startsWith('/api/webhook')) return TIERS.payment;
  if (pathname.startsWith('/api/chat') ||
      pathname.startsWith('/api/stream'))  return TIERS.chat;
  if (pathname.startsWith('/api/gacha'))   return TIERS.gacha;
  return TIERS.default;
}

/**
 * クライアント識別子を取得
 */
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

export interface EdgeRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Edge Runtime レート制限チェック
 * 
 * @param identifier クライアントIP or ユーザーID
 * @param pathname リクエストパス（ティア判定用）
 * @returns allowed=true なら通過、false ならブロック
 */
export function checkEdgeRateLimit(
  identifier: string,
  pathname: string
): EdgeRateLimitResult {
  gc();

  const tier = resolveTier(pathname);
  const key = `${identifier}:${pathname.split('/').slice(0, 4).join('/')}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // 新しいウィンドウ開始
    store.set(key, { count: 1, resetAt: now + tier.windowMs });
    return { allowed: true, remaining: tier.limit - 1, retryAfterSec: 0 };
  }

  entry.count++;

  if (entry.count > tier.limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: tier.limit - entry.count, retryAfterSec: 0 };
}
