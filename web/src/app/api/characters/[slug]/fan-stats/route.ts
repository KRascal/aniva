import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * ファン統計API — 嫉妬メカニクス
 * 「今日一番話した人」「FC会員数」「今日の総会話数」を返す
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    // slugからキャラクターIDを取得
    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    const characterId = character.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 今日のメッセージ数集計（Relationship → Conversation → Message 経由）
    type MessageCountRow = { userId: string; message_count: bigint };
    const todayMessages = await prisma.$queryRaw<MessageCountRow[]>`
      SELECT r."userId", COUNT(m.id) as message_count
      FROM "Relationship" r
      JOIN "Conversation" c ON c."relationshipId" = r.id
      JOIN "Message" m ON m."conversationId" = c.id
      WHERE r."characterId" = ${characterId}
        AND m.role = 'USER'
        AND m."createdAt" >= ${todayStart}
      GROUP BY r."userId"
      ORDER BY message_count DESC
      LIMIT 10
    `;

    // 今日一番話した人（匿名）
    const topFan = todayMessages[0];
    const topFanCount = topFan ? Number(topFan.message_count) : 0;
    const isCurrentUserTop = topFan?.userId === userId;

    // 今日の総メッセージ数
    const totalTodayMessages = todayMessages.reduce((sum, m) => sum + Number(m.message_count), 0);

    // 今日のアクティブファン数
    const activeFansToday = todayMessages.length;

    // FC会員数
    const fcMemberCount = await prisma.characterSubscription.count({
      where: { characterId, status: 'ACTIVE' },
    });

    // フォロワー数
    const followerCount = await prisma.relationship.count({
      where: { characterId, isFollowing: true },
    });

    // 自分の今日のメッセージ数
    let myTodayMessages = 0;
    let myRank = 0;
    if (userId) {
      const myEntry = todayMessages.find(m => m.userId === userId);
      myTodayMessages = myEntry ? Number(myEntry.message_count) : 0;
      myRank = todayMessages.findIndex(m => m.userId === userId) + 1;
    }

    // 週間ランキング（top5）
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyRanking = await prisma.$queryRaw<MessageCountRow[]>`
      SELECT r."userId", COUNT(m.id) as message_count
      FROM "Relationship" r
      JOIN "Conversation" c ON c."relationshipId" = r.id
      JOIN "Message" m ON m."conversationId" = c.id
      WHERE r."characterId" = ${characterId}
        AND m.role = 'USER'
        AND m."createdAt" >= ${weekStart}
      GROUP BY r."userId"
      ORDER BY message_count DESC
      LIMIT 5
    `;

    // ユーザー名を匿名化して返す
    const weeklyTop = weeklyRanking.map((entry, index) => ({
      rank: index + 1,
      messageCount: Number(entry.message_count),
      isMe: entry.userId === userId,
      label: entry.userId === userId ? 'あなた' : `ファン#${index + 1}`,
    }));

    return NextResponse.json({
      topFanMessageCount: topFanCount,
      isCurrentUserTop,
      totalTodayMessages,
      activeFansToday,
      fcMemberCount,
      followerCount,
      myTodayMessages,
      myRank: myRank || null,
      weeklyTop,
    });
  } catch (error) {
    logger.error('Fan stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch fan stats' }, { status: 500 });
  }
}
