import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * 統一API認証関数
 * 
 * 全APIルートでこの関数を使うことで、cookieName判定の不整合を防ぐ。
 * 
 * 背景: staging環境では `authjs.session-token`、本番では `__Secure-authjs.session-token` を使うが、
 * getToken() のデフォルトは `next-auth.session-token` を参照するため、環境によって認証失敗する。
 * この関数で自動判定し、全APIで統一する。
 * 
 * @example
 * ```ts
 * import { getAuthUserId } from '@/lib/api-auth';
 * 
 * export async function GET(req: NextRequest) {
 *   const userId = await getAuthUserId(req);
 *   if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   // ...
 * }
 * ```
 */

function detectCookieName(req: NextRequest): string {
  if (req.cookies.has('__Secure-authjs.session-token')) return '__Secure-authjs.session-token';
  if (req.cookies.has('authjs.session-token')) return 'authjs.session-token';
  return 'next-auth.session-token';
}

/**
 * リクエストから認証済みユーザーIDを取得
 * @returns userId (string) or null if not authenticated
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const cookieName = detectCookieName(req);
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, cookieName, secret });
  return (token?.sub ?? token?.userId as string) || null;
}

/**
 * リクエストから認証トークン全体を取得
 * @returns JWT token payload or null
 */
export async function getAuthToken(req: NextRequest) {
  const cookieName = detectCookieName(req);
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return await getToken({ req, cookieName, secret });
}
