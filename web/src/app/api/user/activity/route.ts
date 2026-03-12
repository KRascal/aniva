import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/user/activity
 * 直近30日間のユーザーメッセージ活動を日別に集計して返す
 * レスポンス: { days: { [date: string]: number }, streak: number, totalDays: number, topCharacter: string | null }
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 直近30日のユーザーメッセージを日別集計
    // Message -> Conversation -> Relationship -> userId の経路で集計
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 生SQLで日別集計（Prismaの型安全な方法では複数JOIN+GROUP BYが難しいため）
    const rows = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT
        TO_CHAR(m."createdAt" AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD') AS day,
        COUNT(*) AS count
      FROM "Message" m
      JOIN "Conversation" c ON m."conversationId" = c.id
      JOIN "Relationship" r ON c."relationshipId" = r.id
      WHERE r."userId" = ${userId}
        AND m."role" = 'USER'
        AND m."createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `;

    // 最も話したキャラを取得
    const topCharRow = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT ch."name", COUNT(*) AS count
      FROM "Message" m
      JOIN "Conversation" c ON m."conversationId" = c.id
      JOIN "Relationship" r ON c."relationshipId" = r.id
      JOIN "Character" ch ON r."characterId" = ch.id
      WHERE r."userId" = ${userId}
        AND m."role" = 'USER'
        AND m."createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY ch."name"
      ORDER BY count DESC
      LIMIT 1
    `;

    // days マップに変換
    const days: Record<string, number> = {};
    for (const row of rows) {
      days[row.day] = Number(row.count);
    }

    // ストリーク計算（今日から遡って連続した日数）
    const today = new Date();
    const tokyoOffset = 9 * 60; // UTC+9
    const tokyoNow = new Date(today.getTime() + (tokyoOffset - today.getTimezoneOffset()) * 60000);
    const todayStr = tokyoNow.toISOString().slice(0, 10);

    let streak = 0;
    let checkDate = new Date(tokyoNow);
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (days[dateStr] && days[dateStr] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // 今日がまだない場合は昨日から遡る
        if (dateStr === todayStr && streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    const totalDays = Object.keys(days).length;
    const topCharacter = topCharRow.length > 0 ? topCharRow[0].name : null;

    return NextResponse.json({ days, streak, totalDays, topCharacter });
  } catch (error) {
    logger.error('[/api/user/activity] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
