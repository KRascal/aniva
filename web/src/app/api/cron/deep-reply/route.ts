/**
 * Deep Reply Cron エンドポイント
 * GET/POST /api/cron/deep-reply
 *
 * DeepReplyQueueからQUEUEDジョブを1件取得し、processDeepReplyを実行する。
 * 外部cronから定期的に叩かれる想定（10秒〜1分間隔）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { processDeepReply } from '@/lib/deep-reply-processor';
import { logger } from '@/lib/logger';

async function handleDeepReply(req: NextRequest) {
  // 認証チェック
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // QUEUEDジョブを1件取得（priority desc, scheduledAt asc）
    const job = await prisma.deepReplyQueue.findFirst({
      where: {
        status: 'QUEUED',
        scheduledAt: { lte: new Date() },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' },
      ],
    });

    if (!job) {
      return NextResponse.json({ status: 'no_jobs' });
    }

    // ステータスをPROCESSINGに更新
    await prisma.deepReplyQueue.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    try {
      // Deep Reply処理実行
      await processDeepReply({
        id: job.id,
        userId: job.userId,
        characterId: job.characterId,
        relationshipId: job.relationshipId,
        conversationId: job.conversationId,
        userMessageId: job.userMessageId,
        thinkingMsgId: job.thinkingMsgId,
        status: job.status,
        priority: job.priority,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
      });

      // 完了
      await prisma.deepReplyQueue.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        status: 'completed',
        jobId: job.id,
      });
    } catch (processError) {
      // 処理失敗
      const newAttempts = job.attempts + 1;
      const newStatus = newAttempts >= job.maxAttempts ? 'FAILED' : 'QUEUED';

      await prisma.deepReplyQueue.update({
        where: { id: job.id },
        data: {
          status: newStatus,
          attempts: newAttempts,
          error:
            processError instanceof Error
              ? processError.message
              : String(processError),
        },
      });

      logger.error('[DeepReply Cron] Job failed', { jobId: job.id, error: processError });

      return NextResponse.json(
        {
          status: 'failed',
          jobId: job.id,
          attempts: newAttempts,
          willRetry: newStatus === 'QUEUED',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error('[DeepReply Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleDeepReply(req);
}

export async function POST(req: NextRequest) {
  return handleDeepReply(req);
}
