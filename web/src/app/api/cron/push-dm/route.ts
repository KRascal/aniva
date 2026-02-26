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

export async function GET(req: NextRequest) {
  // CRON_SECRET 認証チェック
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3050';
    const res = await fetch(`${baseUrl}/api/push/character-notify`, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET! },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[cron/push-dm] character-notify failed:', res.status, body);
      return NextResponse.json(
        { error: 'character-notify returned non-OK', status: res.status, body },
        { status: 502 },
      );
    }

    const data = await res.json();
    console.log('[cron/push-dm] push sent:', JSON.stringify(data));
    return NextResponse.json({ ok: true, result: data });
  } catch (err) {
    console.error('[cron/push-dm] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
