import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';

// ギフト定義（将来的にDBに移行可能）
const GIFT_CATALOG = [
  { id: 'flower', name: '花束', emoji: '💐', coinCost: 10, xpReward: 5, reaction: 'わぁ、きれい！ありがとう！' },
  { id: 'cake', name: 'ケーキ', emoji: '🎂', coinCost: 30, xpReward: 15, reaction: 'うまそう！一緒に食おうぜ！' },
  { id: 'ring', name: '指輪', emoji: '💍', coinCost: 100, xpReward: 50, reaction: 'これ…本気か？大事にするよ' },
  { id: 'star', name: '流れ星', emoji: '🌠', coinCost: 50, xpReward: 25, reaction: 'すげぇ…！お前と見れて最高だ！' },
  { id: 'heart', name: 'ハート', emoji: '❤️', coinCost: 20, xpReward: 10, reaction: 'ドキッ…ありがと' },
  { id: 'crown', name: '王冠', emoji: '👑', coinCost: 200, xpReward: 100, reaction: '俺が王だ！…なんてな。最高のプレゼントだ！' },
  { id: 'meat', name: '肉', emoji: '🍖', coinCost: 15, xpReward: 8, reaction: '肉だー！！！最高！！！' },
  { id: 'sake', name: 'お酒', emoji: '🍶', coinCost: 25, xpReward: 12, reaction: '一杯やるか。お前と飲むのは悪くない' },
  { id: 'treasure', name: '宝箱', emoji: '💎', coinCost: 500, xpReward: 250, reaction: '！！！こんな…すごいものを…一生忘れない！' },
];

// GET: ギフト一覧取得
export async function GET() {
  return NextResponse.json({ gifts: GIFT_CATALOG });
}

// POST: ギフト送信
export async function POST(req: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { characterId, giftType } = await req.json();

    if (!characterId || !giftType) {
      return NextResponse.json({ error: 'Missing characterId or giftType' }, { status: 400 });
    }

    const gift = GIFT_CATALOG.find(g => g.id === giftType);
    if (!gift) {
      return NextResponse.json({ error: 'Invalid gift type' }, { status: 400 });
    }

    // コイン残高チェック
    const coinBalance = await prisma.coinBalance.findUnique({
      where: { userId: userId },
    });

    const freeBalance = coinBalance?.freeBalance ?? 0;
    const paidBalance = coinBalance?.paidBalance ?? 0;
    const totalBalance = freeBalance + paidBalance;

    if (totalBalance < gift.coinCost) {
      return NextResponse.json({ error: 'コインが足りません', success: false }, { status: 402 });
    }

    // コイン消費（free優先）
    let freeSpend = Math.min(freeBalance, gift.coinCost);
    let paidSpend = gift.coinCost - freeSpend;
    const newFree = freeBalance - freeSpend;
    const newPaid = paidBalance - paidSpend;
    const newTotal = newFree + newPaid;

    // トランザクション: コイン消費 + XP付与 + 記録
    const [updatedBalance] = await prisma.$transaction([
      // コイン残高更新
      prisma.coinBalance.update({
        where: { userId: userId },
        data: {
          freeBalance: newFree,
          paidBalance: newPaid,
          balance: newTotal,
        },
      }),
      // コイン取引記録
      prisma.coinTransaction.create({
        data: {
          userId: userId,
          type: 'GIFT_SENT',
          amount: -gift.coinCost,
          balanceAfter: newTotal,
          characterId,
          description: `${gift.name}を送った`,
          metadata: { giftType: gift.id, emoji: gift.emoji, xpReward: gift.xpReward },
        },
      }),
      // XP付与（Relationship更新）
      prisma.relationship.updateMany({
        where: {
          userId: userId,
          characterId,
        },
        data: {
          experiencePoints: { increment: gift.xpReward },
        },
      }),
    ]);

    // レベルアップチェック
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_characterId_locale: {
          userId: userId,
          characterId,
          locale: 'ja',
        },
      },
    });

    if (relationship) {
      const xpThresholds = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000];
      const currentLevel = relationship.level;
      let newLevel = currentLevel;
      for (let i = xpThresholds.length - 1; i >= 0; i--) {
        if (relationship.experiencePoints >= xpThresholds[i]) {
          newLevel = i + 1;
          break;
        }
      }
      if (newLevel > currentLevel) {
        await prisma.relationship.update({
          where: { id: relationship.id },
          data: { level: newLevel },
        });
      }
    }

    // キャラ固有リアクション（character-engineを使ってAI生成も可能だが、軽量にカタログ定義で）
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true, slug: true },
    });

    // キャラ別リアクションカスタマイズ
    let reaction = gift.reaction;
    if (character?.slug === 'luffy' && gift.id === 'meat') {
      reaction = '肉だーーー！！！うめぇぇぇ！！！サイコーーー！！！';
    } else if (character?.slug === 'zoro' && gift.id === 'sake') {
      reaction = 'ふん…悪くない酒だな。付き合ってやる';
    } else if (character?.slug === 'sanji' && gift.id === 'flower') {
      reaction = 'メロリン♡ こんな素敵な花を…俺が料理で返すぜ！';
    } else if (character?.slug === 'nami' && gift.id === 'treasure') {
      reaction = 'きゃー！💰 最高！！あんた分かってるじゃない！';
    } else if (character?.slug === 'chopper' && gift.id === 'heart') {
      reaction = 'う、うれしくなんかないんだからなっ！…えへへ';
    }

    return NextResponse.json({
      success: true,
      reaction,
      giftEmoji: gift.emoji,
      xpGained: gift.xpReward,
      newBalance: newTotal,
    });
  } catch (error) {
    console.error('Gift send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
