import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * ファン統計API — 嫉妬メカニクス
 * 「今日一番話した人」「FC会員数」「今日の総会話数」を返す
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 今日のメッセージ数集計（ユーザー別）
    const todayMessages = await prisma.chatMessage.groupBy({
      by: ['userId'],
      where: {
        characterId,
        role: 'user',
        createdAt: { gte: todayStart },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // 今日一番話した人（匿名）
    const topFan = todayMessages[0];
    const topFanCount = topFan?._count?.id ?? 0;
    const isCurrentUserTop = topFan?.userId === userId;

    // 今日の総メッセージ数
    const totalTodayMessages = todayMessages.reduce((sum, m) => sum + (m._count?.id ?? 0), 0);

    // 今日のアクティブファン数
    const activeFansToday = todayMessages.length;

    // FC会員数
    const fcMemberCount = await prisma.fCSubscription.count({
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
      myTodayMessages = myEntry?._count?.id ?? 0;
      myRank = todayMessages.findIndex(m => m.userId === userId) + 1;
    }

    // 週間ランキング（top5）
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyRanking = await prisma.chatMessage.groupBy({
      by: ['userId'],
      where: {
        characterId,
        role: 'user',
        createdAt: { gte: weekStart },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // ユーザー名を匿名化して返す
    const weeklyTop = weeklyRanking.map((entry, index) => ({
      rank: index + 1,
      messageCount: entry._count?.id ?? 0,
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
    console.error('Fan stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch fan stats' }, { status: 500 });
  }
}
