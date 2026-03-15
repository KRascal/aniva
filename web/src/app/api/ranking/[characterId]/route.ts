/**
 * キャラクター別 推し度ランキングAPI
 * GET /api/ranking/[characterId]?period=daily|weekly|monthly|alltime
 * 
 * ランキングスコア = そのキャラに対する消費コイン数
 * - チャット: 10コイン/回（FC会員も10コインとして加算）
 * - 通話: 1分あたりの通常消費コイン数
 * - ギフト: 送ったコイン数
 * - その他消費: amount < 0 の全トランザクション
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveCharacterId } from '@/lib/resolve-character';

/** JST基準の期間フィルタ */
function getPeriodFilter(period: string): Date | undefined {
  const now = new Date();
  if (period === 'daily') {
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const jstMidnight = new Date(jstNow.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    return new Date(jstMidnight.getTime() - jstOffset);
  }
  if (period === 'weekly') { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (period === 'monthly') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  return undefined; // alltime
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const { characterId: rawCharacterId } = await params;
  const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const period = new URL(req.url).searchParams.get('period') ?? 'alltime';
  const periodFrom = getPeriodFilter(period);

  // 1. 実コイン消費（amount < 0）をユーザー別に集計
  const coinConditions: string[] = [`ct."characterId" = $1`, `ct.amount < 0`];
  const coinParams: (string | Date | number)[] = [characterId];

  if (periodFrom) {
    coinParams.push(periodFrom);
    coinConditions.push(`ct."createdAt" >= $${coinParams.length}`);
  }

  type CoinRow = { userId: string; totalCoins: bigint };
  const coinResults = await prisma.$queryRawUnsafe<CoinRow[]>(
    `SELECT ct."userId", ABS(SUM(ct.amount)) AS "totalCoins"
     FROM "CoinTransaction" ct
     WHERE ${coinConditions.join(' AND ')}
     GROUP BY ct."userId"
     ORDER BY "totalCoins" DESC`,
    ...coinParams,
  );

  // 2. メッセージ数（FC会員の仮想コイン用）
  const msgConditions: string[] = [`m.role = 'USER'`, `r."characterId" = $1`];
  const msgParams: (string | Date | number)[] = [characterId];
  if (periodFrom) {
    msgParams.push(periodFrom);
    msgConditions.push(`m."createdAt" >= $${msgParams.length}`);
  }

  type MsgRow = { userId: string; messageCount: bigint };
  const msgResults = await prisma.$queryRawUnsafe<MsgRow[]>(
    `SELECT r."userId", COUNT(m.id) AS "messageCount"
     FROM "Message" m
     JOIN "Conversation" c ON m."conversationId" = c.id
     JOIN "Relationship" r ON c."relationshipId" = r.id
     WHERE ${msgConditions.join(' AND ')}
     GROUP BY r."userId"`,
    ...msgParams,
  );

  // 3. スコア合算（実コイン消費 + メッセージ×10仮想コイン）
  const scoreMap = new Map<string, number>();
  for (const r of coinResults) {
    scoreMap.set(r.userId, (scoreMap.get(r.userId) ?? 0) + Number(r.totalCoins));
  }
  for (const r of msgResults) {
    const virtualCoins = Number(r.messageCount) * 10;
    scoreMap.set(r.userId, (scoreMap.get(r.userId) ?? 0) + virtualCoins);
  }

  // 重複除去してソート
  const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);
  const userIds = sorted.map(([uid]) => uid);

  // ユーザー情報取得
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, nickname: true, avatarUrl: true, image: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  // リレーション情報
  const relationships = await prisma.relationship.findMany({
    where: { characterId, userId: { in: userIds } },
    select: { userId: true, level: true, isFanclub: true },
  });
  const relMap = new Map(relationships.map(r => [r.userId, r]));

  const ranking = sorted.map(([uid, score], idx) => {
    const user = userMap.get(uid);
    const rel = relMap.get(uid);
    return {
      rank: idx + 1,
      userId: uid,
      displayName: user?.nickname || user?.displayName || '匿名ファン',
      avatarUrl: user?.avatarUrl ?? user?.image ?? null,
      level: rel?.level ?? 0,
      isFanclub: rel?.isFanclub ?? false,
      score,
      scoreLabel: `🪙 ${score.toLocaleString()}`,
      isMe: uid === userId,
    };
  });

  const myRank = ranking.find(r => r.isMe);
  const totalFans = await prisma.relationship.count({
    where: { characterId, isFollowing: true },
  });

  return NextResponse.json({
    characterId,
    period,
    ranking: ranking.slice(0, 30),
    myRank: myRank ?? null,
    totalFans,
  });
}
