/**
 * /api/cron/retention-boost
 * Day1→Day2 リテンション強化cron — 6時間おき
 * 
 * 初回チャット後に戻ってこないユーザーに
 * キャラの口調でパーソナライズされた通知を送る
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import {
  getDay2RetentionTargets,
  generateRetentionNotification,
  analyzeUserActivity,
  isOptimalNotificationTime,
} from '@/lib/notification-personalization';
import { sendPushNotification } from '@/lib/web-push-sender';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const authError = verifyCronAuth(req);
    if (authError) return authError;

    const targets = await getDay2RetentionTargets();
    const sent: string[] = [];
    const skipped: string[] = [];

    for (const target of targets) {
      try {
        // ユーザーのアクティビティパターンを分析
        const pattern = await analyzeUserActivity(target.userId);
        const timing = isOptimalNotificationTime(pattern);

        if (!timing.optimal) {
          skipped.push(`${target.userId}: ${timing.reason}`);
          continue;
        }

        // ユーザー名取得
        const user = await prisma.user.findUnique({
          where: { id: target.userId },
          select: { nickname: true, displayName: true },
        });
        const userName = user?.nickname || user?.displayName || null;

        // パーソナライズされた通知生成
        const notification = generateRetentionNotification(
          target.characterSlug,
          target.characterName,
          target.hoursSinceChat,
          userName,
        );

        // プッシュ通知送信
        const result = await sendPushNotification(
          target.userId,
          notification.title,
          notification.body,
          notification.url,
        );

        if (result.sent > 0) {
          sent.push(`${target.characterName} → ${target.userId}`);
        }
      } catch (e) {
        console.warn(`[RetentionBoost] Error for ${target.userId}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      targets: targets.length,
      sent: sent.length,
      skipped: skipped.length,
      details: { sent, skipped },
    });
  } catch (error) {
    console.error('[RetentionBoost cron] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
