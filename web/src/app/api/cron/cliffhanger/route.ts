/**
 * POST /api/cron/cliffhanger
 * 毎日20:00-22:00 JST の間にランダムタイミングで実行
 * アクティブユーザー（本日メッセージあり）にクリフハンガーを設定
 * → pendingCliffhanger に保存 + Character Message として保存（isCliffhanger: true）
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { setCliffhanger, getCliffhangerTease } from '@/lib/cliffhanger-system';
import { logger } from '@/lib/logger';

const MAX_PER_RUN = 30;

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // 本日（JST）のメッセージがあるRelationshipを対象とする
    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStart = new Date(Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate(),
      0, 0, 0, 0,
    ) - 9 * 60 * 60 * 1000); // JST 0:00 → UTC -9h

    const activeRelationships = await prisma.relationship.findMany({
      where: {
        lastMessageAt: { gte: todayStart },
        totalMessages: { gte: 5 },
      },
      select: {
        id: true,
        pendingCliffhanger: true,
        userId: true,
        characterId: true,
        character: { select: { slug: true, name: true } },
      },
      take: MAX_PER_RUN * 3, // フィルタ後にMAX_PER_RUNに収めるため多め取得
    });

    let set = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const rel of activeRelationships) {
      if (set >= MAX_PER_RUN) break;

      // 既にペンディングがある場合はスキップ
      if (rel.pendingCliffhanger) {
        skipped++;
        continue;
      }

      // 50%の確率で設定（毎日全員にはやらない — ランダム感を演出）
      if (Math.random() > 0.5) {
        skipped++;
        continue;
      }

      try {
        // 1. pendingCliffhanger を設定
        const result = await setCliffhanger(rel.id, rel.character?.slug ?? '');
        if (!result) {
          skipped++;
          continue;
        }

        // 2. 予告メッセージを取得
        const teaseMessage = await getCliffhangerTease(rel.id);
        if (!teaseMessage) {
          skipped++;
          continue;
        }

        // 3. 最新のConversationを取得（なければ新規作成）
        let conversation = await prisma.conversation.findFirst({
          where: { relationshipId: rel.id },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: { relationshipId: rel.id },
            select: { id: true },
          });
        }

        // 4. Messageとして保存（metadata: { isCliffhanger: true }）
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'CHARACTER',
            content: teaseMessage,
            metadata: {
              isCliffhanger: true,
              characterSlug: rel.character?.slug ?? '',
              characterName: rel.character?.name ?? '',
              injectedAt: new Date().toISOString(),
            },
          },
        });

        // 5. Conversationの updatedAt を更新
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        set++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`rel:${rel.id} — ${msg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      activeRelationships: activeRelationships.length,
      cliffhangersSet: set,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Cliffhanger cron error:', error);
    return NextResponse.json({ error: 'Cliffhanger cron failed' }, { status: 500 });
  }
}
