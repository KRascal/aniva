/**
 * GET /api/admin/crons — Cronジョブ一覧 + 状態取得
 * PATCH /api/admin/crons — Cronジョブ ON/OFF 切替（Redisフラグ）
 * super_admin専用
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';

// Cronジョブ定義
const CRON_JOBS = [
  { name: 'account-cleanup', label: 'アカウントクリーンアップ', description: '退会済みアカウントの定期削除', schedule: '毎日 02:00' },
  { name: 'agent-loop', label: 'エージェントループ', description: 'AI自律エージェントの定期実行', schedule: '5分毎' },
  { name: 'anniversary', label: '記念日処理', description: '記念日イベントの自動生成', schedule: '毎日 00:00' },
  { name: 'autonomous-post', label: '自律投稿', description: 'キャラの自律的な投稿生成', schedule: '30分毎' },
  { name: 'character-comments', label: 'キャラコメント', description: 'キャラによるコメント自動生成', schedule: '15分毎' },
  { name: 'character-conversations', label: 'キャラ会話', description: 'キャラ間会話の自動生成', schedule: '1時間毎' },
  { name: 'character-diary', label: 'キャラ日記', description: 'キャラの日記自動生成', schedule: '毎日 23:00' },
  { name: 'character-initiate-chat', label: 'チャット開始', description: 'キャラからチャットを開始', schedule: '10分毎' },
  { name: 'cliffhanger', label: 'クリフハンガー', description: 'ストーリーの引き継ぎ生成', schedule: '毎日 20:00' },
  { name: 'community-posts', label: 'コミュニティ投稿', description: 'コミュニティ投稿の自動生成', schedule: '2時間毎' },
  { name: 'deep-reply', label: 'ディープリプライ', description: '深い返信の自動生成', schedule: '30分毎' },
  { name: 'email-digest', label: 'メールダイジェスト', description: '週次メールダイジェスト送信', schedule: '毎週月曜 09:00' },
  { name: 'emotion-update', label: '感情更新', description: 'キャラの感情状態を定期更新', schedule: '1時間毎' },
  { name: 'expire-proactive-messages', label: 'メッセージ期限切れ', description: '期限切れのプロアクティブメッセージを削除', schedule: '毎日 03:00' },
  { name: 'generate-proactive-messages', label: 'プロアクティブメッセージ生成', description: 'ユーザー向けプロアクティブメッセージを生成', schedule: '30分毎' },
  { name: 'generate-secret-content', label: 'シークレットコンテンツ生成', description: '限定コンテンツの自動生成', schedule: '毎日 12:00' },
  { name: 'generate-story-chapters', label: 'ストーリー章生成', description: 'ストーリーの新章を自動生成', schedule: '毎日 10:00' },
  { name: 'letter', label: 'レター処理', description: 'キャラからの手紙を定期送信', schedule: '毎日 09:00' },
  { name: 'miss-you', label: 'ミスユー', description: '久しぶりのユーザーへのメッセージ', schedule: '4時間毎' },
  { name: 'mission-reminder', label: 'ミッションリマインダー', description: 'ミッション未達成ユーザーへのリマインド', schedule: '毎日 18:00' },
  { name: 'moments', label: 'モーメンツ', description: 'モーメンツの自動生成', schedule: '2時間毎' },
  { name: 'monthly-letter', label: '月次レター', description: '月次特別レターの生成', schedule: '毎月1日 10:00' },
  { name: 'proactive-messages', label: 'プロアクティブメッセージ送信', description: 'プロアクティブメッセージを送信', schedule: '15分毎' },
  { name: 'push-dm', label: 'プッシュDM', description: 'プッシュ通知DMの送信', schedule: '1時間毎' },
  { name: 'push-dm-ai', label: 'プッシュDM(AI)', description: 'AI生成プッシュDMの送信', schedule: '2時間毎' },
  { name: 'retention-boost', label: '継続率ブースト', description: '継続率向上施策の実行', schedule: '毎日 19:00' },
  { name: 'smart-dm', label: 'スマートDM', description: 'スマートDMの自動送信', schedule: '3時間毎' },
  { name: 'stories-post', label: 'ストーリーズ投稿', description: 'ストーリーズの自動投稿', schedule: '4時間毎' },
  { name: 'streak-break', label: 'ストリーク警告', description: 'ストリーク途切れ前のアラート', schedule: '毎日 21:00' },
];

function getRedis() {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 3000,
    keyPrefix: 'aniva:',
  });
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const redis = getRedis();
    const results = await Promise.all(
      CRON_JOBS.map(async (job) => {
        try {
          const [disabled, lastRun] = await Promise.all([
            redis.get(`cron:${job.name}:disabled`),
            redis.get(`cron:${job.name}:lastRun`),
          ]);
          return {
            ...job,
            enabled: !disabled,
            lastRun: lastRun || null,
          };
        } catch {
          return { ...job, enabled: true, lastRun: null };
        }
      })
    );
    await redis.quit();

    logger.info('Admin: crons list fetched', { adminId: ctx.userId });

    return NextResponse.json({ crons: results, total: results.length });
  } catch (error) {
    logger.error('GET /api/admin/crons error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, enabled } = body;

    if (!name || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'name and enabled are required' }, { status: 400 });
    }

    const job = CRON_JOBS.find((j) => j.name === name);
    if (!job) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
    }

    const redis = getRedis();
    if (enabled) {
      await redis.del(`cron:${name}:disabled`);
    } else {
      await redis.set(`cron:${name}:disabled`, '1');
    }
    await redis.quit();

    logger.info('Admin: cron toggle', { adminId: ctx.userId, name, enabled });

    return NextResponse.json({ name, enabled, updated: true });
  } catch (error) {
    logger.error('PATCH /api/admin/crons error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
