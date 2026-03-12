/**
 * Cron認証ヘルパー
 * 全cronルートで統一された認証チェックを提供
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cronリクエストの認証を検証する。
 * ヘッダーのみ許可（URLにシークレットを露出させない）:
 * 1. x-cron-secret ヘッダー
 * 2. Authorization: Bearer <secret> ヘッダー
 *
 * @returns null = 認証成功、NextResponse = 401エラー（そのままreturnすること）
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const secret =
    req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!secret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // 認証OK
}
