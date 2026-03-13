/**
 * /api/cron/character-conversations
 * キャラ間自律会話cron — 4時間おき
 * 
 * キャラ同士が自発的にMomentsで会話し、
 * タイムラインに「キャラの世界」が見える
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { runCharacterConversations } from '@/lib/character-conversation-engine';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const authError = verifyCronAuth(req);
    if (authError) return authError;

    const result = await runCharacterConversations(2); // 1回のcronで最大2会話

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('[CharConversations cron] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
