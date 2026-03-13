import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';
import { logger } from '@/lib/logger';

/** フォロー直後にウェルカムメッセージをDBに書く */
async function sendFollowWelcome(userId: string, characterId: string, characterSlug: string, catchphrases: string[]) {
  try {
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { id: true },
    });
    if (!relationship) return;

    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { relationshipId: relationship.id },
      });
    }

    // 過去24h以内にwelcomeを送っていたらスキップ
    const recentWelcome = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentWelcome) return;

    const slugGreetings: Record<string, string> = {
      luffy: 'ししし！フォローしてくれたか！よろしくな！一緒に冒険しようぜ！',
      zoro: 'フォローか。悪くない。一緒に鍛えるか。',
      nami: 'フォローありがとう！これからよろしくね！何かあれば話しかけて。',
      sanji: 'フォロー、ありがとう。君のためなら何でも作るよ。遠慮せずに話しかけてくれ。',
      gojo: 'フォローしてくれた？最強に嬉しいよ。これからよろしく。',
      tanjiro: 'フォローしてくれてありがとうございます！一緒に頑張りましょう！',
    };

    const welcomeList = [
      'フォローしてくれてありがとう！これからよろしくね。いつでも話しかけて！',
      'フォローしてくれた！嬉しい。一緒にいい時間を過ごそうね。',
      'フォローしてくれたんだ！ありがとう。何か話したいことがあれば遠慮なく！',
    ];
    let welcomeContent = slugGreetings[characterSlug]
      ?? (catchphrases.length > 0 ? `フォローしてくれてありがとう！「${catchphrases[0]}」 これからよろしくね！` : null)
      ?? welcomeList[Math.floor(Math.random() * welcomeList.length)];

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: welcomeContent,
      },
    });
  } catch (err) {
    logger.error('[follow] sendFollowWelcome error:', err);
  }
}

/**
 * POST /api/relationship/[characterId]/follow
 * フォロー/アンフォローを切り替える
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    // キャラクター存在確認
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, slug: true, catchphrases: true },
    });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // ユーザー存在確認（JWTのIDがDB上に存在しない場合のガード）
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please re-login.' }, { status: 404 });
    }

    // Relationship を upsert してフォロー状態をトグル
    const existing = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
    });

    const newFollowing = !(existing?.isFollowing ?? false);

    const relationship = await prisma.relationship.upsert({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      create: {
        userId,
        characterId,
        locale: 'ja',
        isFollowing: true,
      },
      update: {
        isFollowing: newFollowing,
      },
    });

    const followerCount = await prisma.relationship.count({
      where: { characterId, isFollowing: true },
    });

    // フォロー時にウェルカムメッセージを非同期で送信（アンフォローでは送らない）
    if (relationship.isFollowing) {
      const catchphrases = (character.catchphrases ?? []) as string[];
      // 非同期で実行（レスポンスをブロックしない）
      sendFollowWelcome(userId, characterId, character.slug, catchphrases).catch(() => {});
    }

    return NextResponse.json({
      isFollowing: relationship.isFollowing,
      characterId,
      followerCount,
    });
  } catch (error) {
    logger.error('[relationship/follow POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/relationship/[characterId]/follow
 * フォロー状態を取得する
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ isFollowing: false, isFanclub: false });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { isFollowing: true, isFanclub: true },
    });

    const followerCount = await prisma.relationship.count({
      where: { characterId, isFollowing: true },
    });

    return NextResponse.json({
      isFollowing: relationship?.isFollowing ?? false,
      isFanclub: relationship?.isFanclub ?? false,
      followerCount,
    });
  } catch (error) {
    logger.error('[relationship/follow GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
