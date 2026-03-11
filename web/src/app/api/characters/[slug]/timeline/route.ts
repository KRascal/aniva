/**
 * /api/characters/[slug]/timeline
 * キャラの1日タイムライン取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentActivity, getFullTimeline } from '@/lib/character-daily-timeline';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const timeline = getFullTimeline(slug);
  const current = getCurrentActivity(slug);

  if (timeline.length === 0) {
    return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
  }

  return NextResponse.json({
    slug,
    currentActivity: current,
    timeline,
  });
}
