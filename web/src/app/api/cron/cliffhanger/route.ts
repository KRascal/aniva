/**
 * POST /api/cron/cliffhanger
 * 毎日21:00 JST実行 — アクティブユーザーにクリフハンガーを設定
 * 翌日のチャット開始時にsystemPromptに注入される
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setCliffhanger } from '@/lib/cliffhanger-system';

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // 過去3日以内にメッセージを送ったアクティブなRelationship
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const activeRelationships = await prisma.relationship.findMany({
      where: {
        lastMessageAt: { gte: threeDaysAgo },
        totalMessages: { gte: 5 },
      },
      select: {
        id: true,
        pendingCliffhanger: true,
        character: { select: { slug: true } },
      },
    });

    let set = 0;
    let skipped = 0;

    for (const rel of activeRelationships) {
      // 既にペンディングがある場合はスキップ（setCliffhanger内でもチェック）
      if (rel.pendingCliffhanger) {
        skipped++;
        continue;
      }

      // 50%の確率で設定（毎日全員にはやらない）
      if (Math.random() > 0.5) {
        skipped++;
        continue;
      }

      const result = await setCliffhanger(rel.id, rel.character?.slug ?? 'luffy');
      if (result) set++;
      else skipped++;
    }

    return NextResponse.json({
      success: true,
      activeRelationships: activeRelationships.length,
      cliffhangersSet: set,
      skipped,
    });
  } catch (error) {
    console.error('Cliffhanger cron error:', error);
    return NextResponse.json({ error: 'Cliffhanger cron failed' }, { status: 500 });
  }
}
