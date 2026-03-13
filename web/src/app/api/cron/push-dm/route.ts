/**
 * Cron endpoint for push DM delivery
 *
 * Usage (external cron / crontab / PM2):
 *   GET /api/cron/push-dm
 *   Header: x-cron-secret: <CRON_SECRET>
 *
 * Recommended schedule (JST):
 *   0 8  * * *  curl -s http://localhost:3050/api/cron/push-dm -H "x-cron-secret: $CRON_SECRET"
 *   0 13 * * *  curl -s http://localhost:3050/api/cron/push-dm -H "x-cron-secret: $CRON_SECRET"
 *   0 20 * * *  curl -s http://localhost:3050/api/cron/push-dm -H "x-cron-secret: $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  // CRON_SECRET 認証チェック
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // localhost直接呼び出し（Nginx Basic Authバイパス）
    const port = process.env.PORT || '3050';
    const baseUrl = `http://localhost:${port}`;
    const res = await fetch(`${baseUrl}/api/push/character-notify`, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET! },
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error('[cron/push-dm] character-notify failed', { status: res.status, body });
      return NextResponse.json(
        { error: 'character-notify returned non-OK', status: res.status, body },
        { status: 502 },
      );
    }

    const data = await res.json();
    logger.info('[cron/push-dm] push sent', { data });
    return NextResponse.json({ ok: true, result: data });
  } catch (err) {
    logger.error('[cron/push-dm] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
