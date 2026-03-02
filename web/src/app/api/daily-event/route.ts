/**
 * GET /api/daily-event
 * ログイン時のデイリーイベント判定（変動報酬システム）
 * normal(85%) / good(10%) / rare(4%) / super_rare(1%)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserDailyEvent } from '@/lib/daily-event-system';

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await getUserDailyEvent(userId);

    return NextResponse.json({
      eventType: event.eventType,
      isNew: event.isNew,
      reward: event.reward,
      display: event.displayData,
    });
  } catch (error) {
    console.error('Daily event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
