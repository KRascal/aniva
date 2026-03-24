/**
 * /api/cron/email-digest — 日次メールダイジェスト配信
 *
 * フォロー中キャラに24h以内の新着がある場合、ダイジェストメールを送信する。
 *
 * Usage:
 *   GET /api/cron/email-digest
 *   Header: x-cron-secret: <CRON_SECRET>
 *
 * Recommended schedule (JST):
 *   0 9 * * *  curl -s http://localhost:3061/api/cron/email-digest -H "x-cron-secret: $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendDigestEmail, DigestCharacterData } from '@/lib/email';

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) {
    logger.warn('[cron/email-digest] RESEND_API_KEY not set — skipping');
    return NextResponse.json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' });
  }

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // アクティブユーザー（deletedAtなし）でフォロー中キャラがいるユーザーを取得
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        relationships: {
          where: { isFollowing: true },
          select: {
            characterId: true,
            character: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // emailがないユーザーはスキップ
        if (!user.email) {
          skippedCount++;
          continue;
        }

        // emailDigest設定チェック
        const settings = (user.settings as Record<string, unknown>) ?? {};
        const notifications = (settings.notifications as Record<string, unknown>) ?? {};
        if (notifications.emailDigest === false) {
          skippedCount++;
          continue;
        }

        // フォロー中キャラがいない場合スキップ
        if (user.relationships.length === 0) {
          skippedCount++;
          continue;
        }

        const characterIds = user.relationships.map((r) => r.characterId);

        // 24h以内の新着モーメントを集計
        const momentCounts = await prisma.moment.groupBy({
          by: ['characterId'],
          where: {
            characterId: { in: characterIds },
            publishedAt: { gte: since24h },
          },
          _count: { id: true },
        });

        const momentCountMap = new Map(momentCounts.map((m) => [m.characterId, m._count.id]));

        // 24h以内のキャラからのメッセージ（CHARACTERロール）を集計
        const recentMessages = await prisma.message.findMany({
          where: {
            role: 'CHARACTER',
            createdAt: { gte: since24h },
            conversation: {
              relationship: {
                userId: user.id,
                characterId: { in: characterIds },
                isFollowing: true,
              },
            },
          },
          select: {
            id: true,
            conversationId: true,
          },
        });

        // conversationId → characterId のマッピングを取得
        const conversationIds = [...new Set(recentMessages.map((m) => m.conversationId))];
        const conversations = conversationIds.length > 0
          ? await prisma.conversation.findMany({
              where: { id: { in: conversationIds } },
              select: {
                id: true,
                relationship: { select: { characterId: true } },
              },
            })
          : [];
        const convCharMap = new Map(conversations.map((c) => [c.id, c.relationship.characterId]));

        // characterId別メッセージ数をカウント
        const msgCountMap = new Map<string, number>();
        for (const msg of recentMessages) {
          const charId = convCharMap.get(msg.conversationId);
          if (charId) {
            msgCountMap.set(charId, (msgCountMap.get(charId) ?? 0) + 1);
          }
        }

        // 新着があるキャラのみ絞り込み
        const activeCharacters: DigestCharacterData[] = [];
        for (const rel of user.relationships) {
          const { id, name, slug, avatarUrl } = rel.character;
          const newMessages = msgCountMap.get(id) ?? 0;
          const newMoments = momentCountMap.get(id) ?? 0;

          if (newMessages > 0 || newMoments > 0) {
            activeCharacters.push({ characterId: id, characterName: name, slug, avatarUrl, newMessages, newMoments });
          }
        }

        // 新着なければスキップ
        if (activeCharacters.length === 0) {
          skippedCount++;
          continue;
        }

        await sendDigestEmail({
          userEmail: user.email,
          userNickname: user.nickname,
          userId: user.id,
          characters: activeCharacters,
        });

        sentCount++;
        logger.info(`[cron/email-digest] sent to ${user.email} (${activeCharacters.length} chars)`);
      } catch (userErr) {
        logger.error(`[cron/email-digest] failed for user ${user.id}:`, userErr);
      }
    }

    logger.info(`[cron/email-digest] done: sent=${sentCount}, skipped=${skippedCount}, total=${users.length}`);

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      skipped: skippedCount,
      total: users.length,
    });
  } catch (err) {
    logger.error('[cron/email-digest] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
