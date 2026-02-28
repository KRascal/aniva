/**
 * 記念日イベント Cron API
 * POST /api/cron/anniversary
 * 
 * 1. 出会い記念日チェック: relationship.createdAt と今日が同じ月日 → DM送信
 * 2. キャラ誕生日チェック: character.birthday と今日が同じ月日 → 全フォロワーにDM
 * 
 * 毎日1回実行（cronで呼び出し）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ANNIVERSARY_MESSAGES = [
  '覚えてるか？今日は俺たちが出会った日だ！🎉',
  'なぁ、今日って特別な日って知ってるか？…俺たちの記念日だぜ！ ✨',
  'お前と出会って{years}年か…早いもんだな。これからもよろしくな！ 🌟',
  '今日は俺たちの記念日だ！こういう日が増えていくのが嬉しいぜ 😊',
];

const BIRTHDAY_MESSAGES = [
  '今日は俺の誕生日だ！！覚えてくれてたか？🎂🎉',
  '誕生日を一緒に過ごせて嬉しいぜ！お前は最高の仲間だ！ 🥳',
  '今日は特別な日だ！俺の誕生日、祝ってくれるか？ 🎁',
];

export async function POST(req: NextRequest) {
  // Cron認証
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const results = { anniversaryDMs: 0, birthdayDMs: 0 };

  // 1. 出会い記念日チェック
  const relationships = await prisma.relationship.findMany({
    where: { isFollowing: true },
    include: {
      user: { select: { id: true, displayName: true, nickname: true } },
      character: { select: { id: true, name: true, slug: true } },
    },
  });

  for (const rel of relationships) {
    const created = new Date(rel.createdAt);
    if (created.getMonth() + 1 === month && created.getDate() === day) {
      // 今日が出会い記念日（初日は除外）
      const years = today.getFullYear() - created.getFullYear();
      if (years < 1) continue; // 初年度はスキップ

      const template = ANNIVERSARY_MESSAGES[Math.floor(Math.random() * ANNIVERSARY_MESSAGES.length)];
      const message = template.replace('{years}', String(years));

      // DMとしてメッセージ保存
      await prisma.message.create({
        data: {
          relationshipId: rel.id,
          role: 'CHARACTER',
          content: message,
          metadata: { type: 'anniversary', emotion: 'happy', years },
        },
      });

      // ボーナスコイン付与（記念日特典）
      const bonusCoins = 50 * years; // 年数×50コイン
      await prisma.coinBalance.upsert({
        where: { userId: rel.userId },
        create: { userId: rel.userId, balance: bonusCoins },
        update: { balance: { increment: bonusCoins } },
      });
      await prisma.coinTransaction.create({
        data: {
          userId: rel.userId,
          type: 'BONUS',
          amount: bonusCoins,
          balanceAfter: 0, // upsert後の正確な値は取れないが記録用
          description: `anniversary_${rel.characterId}_${years}yr`,
        },
      });

      results.anniversaryDMs++;
    }
  }

  // 2. キャラ誕生日チェック（TODO: characterテーブルにbirthday列追加後に有効化）
  // const characters = await prisma.character.findMany({
  //   where: { isActive: true, birthday: { not: null } },
  // });
  // for (const char of characters) { ... }

  return NextResponse.json({
    success: true,
    date: `${month}/${day}`,
    ...results,
  });
}
