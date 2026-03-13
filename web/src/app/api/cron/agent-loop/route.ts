/**
 * キャラクターエージェントループ Cron エンドポイント
 * POST /api/cron/agent-loop
 * Header: x-cron-secret または Authorization: Bearer <secret>
 *
 * 30分ごとに実行し、CharacterAgentLoopを呼ぶ。
 * DRY_RUNモードはデフォルトで有効（AGENT_DRY_RUN=false で本番送信）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { runCharacterAgentLoop } from '@/lib/agent/character-agent-loop';

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const summary = await runCharacterAgentLoop();

    return NextResponse.json({
      success: true,
      dryRun: summary.dryRun,
      summary: {
        totalProcessed: summary.totalProcessed,
        decided: summary.decided,
        delivered: summary.delivered,
        skippedByTiming: summary.skippedByTiming,
        skippedByDecision: summary.skippedByDecision,
        errors: summary.errors,
        durationMs: summary.durationMs,
      },
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[cron/agent-loop] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      },
      { status: 500 },
    );
  }
}
