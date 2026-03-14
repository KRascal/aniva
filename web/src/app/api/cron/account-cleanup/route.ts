/**
 * アカウント物理削除 Cron API
 * POST /api/cron/account-cleanup
 *
 * deleteScheduledAt < now() のユーザーを物理削除する。
 * 毎日AM4:00に実行（vercel.json or 外部cronで呼び出し）
 *
 * 削除対象:
 * - User + Account + Session
 * - Relationship + Conversation + Message
 * - CoinBalance + CoinTransaction + Transaction
 * - Subscription + Moment + MomentComment + CommentLike
 * - CharacterSubscription + SemanticMemory
 * - PushSubscription + Notification
 * - UserProfile + CharacterUserProfile
 * - RankingScore + DeepReplyQueue
 * - UserCard + UserGachaPity + UserDailyEvent + UserStoryProgress
 * - ShopOrder + LetterDelivery + Letter + StoryPollVote
 * - FanThread + FanReply + CharacterDiaryLike + LimitedScenarioRead
 * - CharacterFeedback + CharacterProactiveMessage + CharacterAgentDecision
 * （Cascade設定があるものは自動削除、ないものは明示的に削除）
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();

  try {
    // 削除対象ユーザーを取得
    const targetUsers = await prisma.user.findMany({
      where: {
        deleteScheduledAt: { lt: now },
        deletedAt: { not: null },
      },
      select: { id: true, email: true, deleteScheduledAt: true },
    });

    if (targetUsers.length === 0) {
      logger.info('[account-cleanup] No users to delete.');
      return NextResponse.json({ success: true, deleted: 0 });
    }

    logger.info(`[account-cleanup] Deleting ${targetUsers.length} user(s)...`);

    const userIds = targetUsers.map((u) => u.id);
    let deletedCount = 0;
    const errors: string[] = [];

    for (const user of targetUsers) {
      try {
        await prisma.$transaction(async (tx) => {
          // Cascade削除が設定されていないモデルを先に削除

          // ファンスレッド・リプライ
          await tx.fanReply.deleteMany({ where: { userId: user.id } });
          await tx.fanThread.deleteMany({ where: { userId: user.id } });

          // ストーリーポーリング投票
          await tx.storyPollVote.deleteMany({ where: { userId: user.id } });

          // 限定シナリオ既読
          await tx.limitedScenarioRead.deleteMany({ where: { userId: user.id } });

          // キャラ日記いいね
          await tx.characterDiaryLike.deleteMany({ where: { userId: user.id } });

          // キャラフィードバック
          await tx.characterFeedback.deleteMany({ where: { userId: user.id } });

          // ランキングスコア
          await tx.rankingScore.deleteMany({ where: { userId: user.id } });

          // ユーザーカード / ガチャpity
          await tx.userCard.deleteMany({ where: { userId: user.id } });
          await tx.userGachaPity.deleteMany({ where: { userId: user.id } });

          // 日次イベント
          await tx.userDailyEvent.deleteMany({ where: { userId: user.id } });

          // ストーリー進捗
          await tx.userStoryProgress.deleteMany({ where: { userId: user.id } });

          // ショップ注文
          await tx.shopOrder.deleteMany({ where: { userId: user.id } });

          // レター・レター配信
          await tx.letterDelivery.deleteMany({ where: { userId: user.id } });
          await tx.letter.deleteMany({ where: { userId: user.id } });

          // キャラ関連（プロアクティブ・エージェント決定）
          await tx.characterProactiveMessage.deleteMany({ where: { userId: user.id } });
          await tx.characterAgentDecision.deleteMany({ where: { userId: user.id } });

          // セマンティックメモリ
          await tx.semanticMemory.deleteMany({ where: { userId: user.id } });

          // Deep Reply Queue
          await tx.deepReplyQueue.deleteMany({ where: { userId: user.id } });

          // CharacterUserProfile
          await tx.characterUserProfile.deleteMany({ where: { userId: user.id } });

          // UserProfile
          await tx.userProfile.deleteMany({ where: { userId: user.id } });

          // 通知
          await tx.notification.deleteMany({ where: { userId: user.id } });

          // コメントいいね → コメント → モーメント
          await tx.commentLike.deleteMany({ where: { userId: user.id } });
          await tx.momentComment.deleteMany({ where: { userId: user.id } });
          await tx.moment.deleteMany({ where: { userId: user.id } });

          // サブスクリプション・トランザクション
          await tx.subscription.deleteMany({ where: { userId: user.id } });
          await tx.transaction.deleteMany({ where: { userId: user.id } });

          // コイン
          await tx.coinTransaction.deleteMany({ where: { userId: user.id } });
          await tx.coinBalance.deleteMany({ where: { userId: user.id } });

          // メッセージ → 会話
          await tx.message.deleteMany({
            where: { conversation: { userId: user.id } },
          });
          await tx.conversation.deleteMany({ where: { userId: user.id } });

          // リレーションシップ（双方向）
          await tx.relationship.deleteMany({
            where: { OR: [{ userId: user.id }, { targetUserId: user.id }] },
          });

          // CharacterSubscription
          await tx.characterSubscription.deleteMany({ where: { userId: user.id } });

          // Push Subscription / Account / Session は onDelete: Cascade なのでUser削除時に自動削除
          // VerificationCode
          await tx.verificationCode.deleteMany({ where: { email: user.email } });

          // ブロック関係
          await tx.userBlock.deleteMany({
            where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
          });

          // 通報（reporter side）
          await tx.report.deleteMany({ where: { reporterId: user.id } });

          // 最後にUser本体を削除（Cascade: Account, Session, PushSubscription が自動削除される）
          await tx.user.delete({ where: { id: user.id } });
        });

        deletedCount++;

        // 監査ログ記録
        await auditLog('account_deleted', {
          userId: user.id,
          email: user.email,
          deleteScheduledAt: user.deleteScheduledAt?.toISOString(),
          deletedAt: now.toISOString(),
          source: 'cron/account-cleanup',
        });

        logger.info(`[account-cleanup] Deleted user: ${user.id} (${user.email})`);
      } catch (userError) {
        const errMsg = userError instanceof Error ? userError.message : String(userError);
        errors.push(`${user.id}: ${errMsg}`);
        logger.error(`[account-cleanup] Failed to delete user ${user.id}:`, userError);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('[account-cleanup] Cron failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
