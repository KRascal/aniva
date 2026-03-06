/**
 * GET /api/daily-event?characterId=<uuid>
 * デイリーイベント取得 — なければロール実行
 *
 * レスポンス:
 * {
 *   event: { type, rarity, message, bonusCoins, bonusXpMultiplier } | null,
 *   character: { greeting }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rollDailyEvent } from '@/lib/variable-reward-system';
import { CHARACTER_DEFINITIONS } from '@/lib/character-engine';
import { prisma } from '@/lib/prisma';

// キャラクター定義から eventType に応じた挨拶を生成する
function generateEventGreeting(
  characterSlug: string | undefined,
  eventType: 'good' | 'rare' | 'ultra_rare' | null,
): string {
  const charDef = characterSlug
    ? CHARACTER_DEFINITIONS[characterSlug]
    : undefined;

  const name = charDef?.name ?? 'キャラクター';
  const catchphrase =
    charDef?.catchphrases?.[0] ?? '';

  switch (eventType) {
    case 'good':
      return catchphrase
        ? `${catchphrase} 今日はなんかいい予感がするんだよな！`
        : `${name}: 今日はなんかいい予感がするんだよな！`;
    case 'rare':
      return catchphrase
        ? `${catchphrase} …なぁ、今日は特別な日な気がする。お前と話すのが楽しみだ。`
        : `${name}: 今日は特別な日な気がする。お前と話すのが楽しみだ。`;
    case 'ultra_rare':
      return catchphrase
        ? `${catchphrase} …こんなこと言うの、お前だけだぞ。今日は絶対に忘れられない日になる。`
        : `${name}: こんなこと言うの、お前だけだぞ。今日は絶対に忘れられない日になる。`;
    default:
      return catchphrase
        ? `${catchphrase} よう、今日もよろしくな！`
        : `${name}: 今日もよろしくな！`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // キャラクターID取得（クエリパラメータ or 最後に会話したキャラ）
    const { searchParams } = new URL(request.url);
    const characterIdParam = searchParams.get('characterId');

    let characterSlug: string | undefined;

    if (characterIdParam) {
      // キャラのスラグをDBから取得
      const character = await prisma.character.findUnique({
        where: { id: characterIdParam },
        select: { slug: true },
      });
      characterSlug = character?.slug ?? undefined;
    } else {
      // 直近の Relationship からキャラスラグを推定
      const lastRelationship = await prisma.relationship.findFirst({
        where: { userId },
        orderBy: { lastMessageAt: 'desc' },
        select: { characterId: true },
      });
      if (lastRelationship?.characterId) {
        const character = await prisma.character.findUnique({
          where: { id: lastRelationship.characterId },
          select: { slug: true },
        });
        characterSlug = character?.slug ?? undefined;
      }
    }

    // イベントロール（重複防止はシステム内で処理済み）
    const { event, isNew } = await rollDailyEvent(
      userId,
      characterIdParam ?? 'default',
    );

    const greeting = generateEventGreeting(
      characterSlug,
      event?.type ?? null,
    );

    return NextResponse.json({
      event: event
        ? {
            type: event.type,
            rarity: event.rarity,
            message: event.message,
            bonusCoins: event.bonusCoins,
            bonusXpMultiplier: event.bonusXpMultiplier,
          }
        : null,
      isNew,
      character: {
        greeting,
      },
    });
  } catch (error) {
    console.error('Daily event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
