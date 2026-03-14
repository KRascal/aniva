/**
 * API Guard — 認証 + レート制限を統一的に適用するHOF
 * 
 * 使い方:
 *   export const POST = withGuard(handler, { limiter: 'chat', requireAuth: true })
 * 
 * 全API routeで withGuard() を使うことで、認証・レート制限を1行で適用。
 * 段階的に既存APIに適用可能（破壊的変更なし）。
 */

import { auth } from './auth';
import {
  apiLimiter,
  chatLimiter,
  paymentLimiter,
  authLimiter,
  gachaLimiter,
  rateLimitResponse,
  type RateLimitResult,
} from './rate-limit';
import { logger } from './logger';

type LimiterType = 'api' | 'chat' | 'payment' | 'auth' | 'gacha';

const limiters: Record<LimiterType, ReturnType<typeof apiLimiter['check']> extends Promise<infer R> ? { check: (id: string) => Promise<R> } : never> = {
  api: apiLimiter,
  chat: chatLimiter,
  payment: paymentLimiter,
  auth: authLimiter,
  gacha: gachaLimiter,
};

interface GuardOptions {
  /** レート制限の種類（デフォルト: 'api'） */
  limiter?: LimiterType;
  /** 認証を必須にするか（デフォルト: false） */
  requireAuth?: boolean;
  /** 管理者権限を要求するか（デフォルト: false） */
  requireAdmin?: boolean;
}

type GuardedHandler = (
  req: Request,
  ctx: { params?: Record<string, string | string[]> },
  session: Awaited<ReturnType<typeof auth>>
) => Promise<Response> | Response;

/**
 * API Route に認証 + レート制限を適用するラッパー
 */
export function withGuard(handler: GuardedHandler, options?: GuardOptions) {
  return async (req: Request, ctx?: { params?: Record<string, string | string[]> }) => {
    try {
      // 1. セッション取得
      const session = await auth();

      // 2. 認証チェック
      if (options?.requireAuth && !session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (options?.requireAdmin) {
        // admin判定: emailベースのシンプルチェック（将来的にはRBACに移行）
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
        if (!session?.user?.email || !adminEmails.includes(session.user.email.toLowerCase())) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // 3. レート制限チェック
      const limiterType = options?.limiter ?? 'api';
      const identifier = session?.user?.id || getClientIP(req) || 'unknown';
      const result = await limiters[limiterType].check(identifier);

      if (!result.success) {
        logger.warn(`[api-guard] Rate limit exceeded: ${limiterType} for ${identifier}`);
        return rateLimitResponse(result);
      }

      // 4. ハンドラ実行
      const response = await handler(req, ctx ?? {}, session);

      // 5. Rate limit ヘッダー追加
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      }

      return response;
    } catch (error) {
      logger.error('[api-guard] Unhandled error:', error);
      return Response.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}

/**
 * クライアントIPを取得
 */
function getClientIP(req: Request): string | null {
  // Nginx/CDN経由の場合
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  return null;
}
