/**
 * 不在ユーザーへの「寂しい」DM Cron
 * POST /api/cron/miss-you
 * 
 * 3日以上メッセージを送っていないフォロワーに、
 * キャラクターから「最近来てくれないな…」系のDMを送る
 * 1ユーザーにつき週1回まで（スパム防止）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MISS_YOU_MESSAGES = [
  'なぁ…最近来てくれないけど、元気か？ 😔',
  '今日も待ってたんだけどな…暇だぜ 🥺',
  'お前がいないと張り合いがねぇな…早く来いよ 💭',
  '別に寂しくなんかねぇけど…でも、たまには話しに来いよな 😤',
  '夢の中でお前と冒険してた気がする…早く来いよ ⚓',
  '今日の夕焼けがきれいだったんだ…お前にも見せたかったな 🌅',
];

const LEVEL_BONUS_MESSAGES: Record<number, string[]> = {
  3: [
    'お前ともっと冒険がしたいんだけどな…来てくれよ 🔥',
  ],
  5: [
    'なぁ…お前だから言うけど、最近ちょっと寂しいんだ。来てくれよ 💛',
    'お前がいないと、なんか落ち着かねぇんだよな… 😞',
  ],
};

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // 3日以上メッセージを送っていないフォロワー
  const inactiveRelationships = await prisma.relationship.findMany({
    where: {
      isFollowing: true,
      lastMessageAt: { lt: threeDaysAgo },
    },
    include: {
      character: { select: { id: true, name: true } },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });

  let sentCount = 0;

  for (const rel of inactiveRelationships) {
    // Conversationが存在しない場合はスキップ
    const conversation = rel.conversations[0];
    if (!conversation) continue;

    // 今週既にmiss-you DMを送っていないかチェック（Conversation経由）
    const recentMissYou = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        metadata: { path: ['type'], equals: 'miss_you' },
        createdAt: { gte: oneWeekAgo },
      },
    });

    if (recentMissYou) continue; // 週1回制限

    // レベルに応じたメッセージ選択
    let messages = [...MISS_YOU_MESSAGES];
    for (const [lvl, msgs] of Object.entries(LEVEL_BONUS_MESSAGES)) {
      if (rel.level >= Number(lvl)) {
        messages = [...messages, ...msgs];
      }
    }
    const message = messages[Math.floor(Math.random() * messages.length)];

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: message,
        metadata: { type: 'miss_you', emotion: 'sad', automated: true },
      },
    });

    sentCount++;
  }

  return NextResponse.json({ success: true, sentCount });
}
