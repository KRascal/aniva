/**
 * ギフト送信API（コイン消費型）
 * POST /api/gift/send
 * body: { characterId, giftType }
 * 
 * キャラにコインでギフトを送る → キャラが喜ぶリアクション返却
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface GiftType {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
  xpReward: number;
}

export const GIFT_TYPES: GiftType[] = [
  { id: 'meat',    name: '肉',       emoji: '🍖', coinCost: 50,   xpReward: 10 },
  { id: 'sake',    name: 'お酒',     emoji: '🍶', coinCost: 100,  xpReward: 20 },
  { id: 'flower',  name: '花束',     emoji: '💐', coinCost: 200,  xpReward: 40 },
  { id: 'crown',   name: '王冠',     emoji: '👑', coinCost: 500,  xpReward: 100 },
  { id: 'diamond', name: 'ダイヤ',   emoji: '💎', coinCost: 1000, xpReward: 200 },
  { id: 'ship',    name: '海賊船',   emoji: '🏴‍☠️', coinCost: 3000, xpReward: 500 },
];

// キャラのギフトリアクション（ランダム選択）
const GIFT_REACTIONS: Record<string, string[]> = {
  meat:    ['肉だ！！うめぇ〜！！🔥', 'おおー！肉くれんの！？最高だ！！🍖', 'ガハハ！ありがてぇ！お前最高だな！'],
  sake:    ['お〜！一緒に飲もうぜ！🍶', 'ゾロが喜びそうだな！ししし！', '乾杯だ！お前に！'],
  flower:  ['おっ、花か！なんか照れるな…😊', 'き、綺麗だな…ありがとう！', 'お前…いいやつだな！大事にするぞ！'],
  crown:   ['王冠！？海賊王に一歩近づいたぞ！！👑', 'すげぇ！！お前は俺の最高の仲間だ！！', 'これが…海賊王の冠か…ありがとう、大切にする'],
  diamond: ['ダ、ダイヤ！？ナミが見たら大変だぞ！💎', 'こんなすげぇもの…俺にくれんのか！？', 'お前…本気か？ありがとう…マジで嬉しい'],
  ship:    ['海賊船！！！新しい冒険の始まりだ！！🏴‍☠️⚓', 'お前と一緒に海に出るぞ！！最高の仲間だ！！', 'これは…メリーの次に大事な船になるな…ありがとう、相棒'],
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { characterId, giftType: giftTypeId } = await req.json();

  if (!characterId || !giftTypeId) {
    return NextResponse.json({ error: 'characterId and giftType required' }, { status: 400 });
  }

  const giftType = GIFT_TYPES.find(g => g.id === giftTypeId);
  if (!giftType) {
    return NextResponse.json({ error: 'Invalid gift type' }, { status: 400 });
  }

  // コイン残高チェック
  const balance = await prisma.coinBalance.findUnique({ where: { userId } });
  if (!balance || balance.balance < giftType.coinCost) {
    return NextResponse.json({
      error: 'コインが足りません',
      required: giftType.coinCost,
      current: balance?.balance ?? 0,
    }, { status: 400 });
  }

  // トランザクション: コイン消費 + XP付与
  const [updatedBalance] = await prisma.$transaction([
    prisma.coinBalance.update({
      where: { userId },
      data: { balance: { decrement: giftType.coinCost } },
    }),
    prisma.coinTransaction.create({
      data: {
        userId,
        type: 'GIFT_SENT',
        amount: -giftType.coinCost,
        balanceAfter: balance.balance - giftType.coinCost,
        characterId,
        description: `gift_${giftType.id}_to_${characterId}`,
      },
    }),
    prisma.relationship.updateMany({
      where: { userId, characterId },
      data: { experiencePoints: { increment: giftType.xpReward } },
    }),
  ]);

  // キャラのリアクション
  const reactions = GIFT_REACTIONS[giftType.id] ?? ['ありがとう！'];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];

  return NextResponse.json({
    success: true,
    gift: giftType,
    reaction,
    newBalance: updatedBalance.balance,
    xpGained: giftType.xpReward,
  });
}

// ギフト一覧取得
export async function GET() {
  return NextResponse.json({ gifts: GIFT_TYPES });
}
