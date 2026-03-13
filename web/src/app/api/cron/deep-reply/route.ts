/**
 * Deep Reply Cron エンドポイント
 * GET/POST /api/cron/deep-reply
 *
 * DeepReplyQueueからQUEUEDジョブを最大2件処理する。
 * 外部cronから1分間隔で叩かれる想定。
 * 実際の処理はlib/deep-reply-processor.tsに委譲。
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { processDeepReply, DEEP_QUEUE_STATUS } from '@/lib/deep-reply-processor';
import { logger } from '@/lib/logger';

async function handleDeepReply(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // QUEUEDジョブを最大2件取得
    const jobs = await prisma.deepReplyQueue.findMany({
      where: {
        status: DEEP_QUEUE_STATUS.QUEUED,
        scheduledAt: { lte: new Date() },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' },
      ],
      take: 2,
    });

    if (jobs.length === 0) {
      return NextResponse.json({ status: 'no_jobs' });
    }

    // PROCESSING にマーク、その後 processDeepReply に委譲（内部でDONE/FAILEDを更新）
    for (const job of jobs) {
      await prisma.deepReplyQueue.update({
        where: { id: job.id },
        data: { status: DEEP_QUEUE_STATUS.PROCESSING, startedAt: new Date() },
      }).catch(() => {});
    }

    // 並列処理（最大2件）
    const results = await Promise.allSettled(
      jobs.map((job) =>
        processDeepReply({
          id: job.id,
          userId: job.userId,
          characterId: job.characterId,
          conversationId: job.conversationId,
          thinkingMessageId: job.thinkingMsgId,
          userMessage: job.userMessageId, // processorがIDからテキストを解決する
          attempts: job.attempts,
        }),
      ),
    );

    const processed = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      status: 'ok',
      processed,
      failed,
      total: jobs.length,
    });
  } catch (error) {
    logger.error('[deep-reply cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handleDeepReply(req); }
export async function POST(req: NextRequest) { return handleDeepReply(req); }
