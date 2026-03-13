import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/onboarding/follow-and-greet
 * オンボーディング完了後、フォローしたキャラを一括フォロー + 挨拶メッセージ送信
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { characterIds } = await req.json();

    if (!Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json({ error: 'characterIds required' }, { status: 400 });
    }

    // キャラクター情報を取得
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });

    for (const char of characters) {
      // 1. Relationship作成 or 更新（isFollowing = true）
      await prisma.relationship.upsert({
        where: {
          userId_characterId_locale: { userId, characterId: char.id, locale: 'ja' },
        },
        create: {
          userId,
          characterId: char.id,
          locale: 'ja',
          level: 1,
          experiencePoints: 0,
          isFollowing: true,
        },
        update: {
          isFollowing: true,
        },
      });

      // 2. Conversation作成 + チャットにウェルカムメッセージ送信
      const relationship = await prisma.relationship.findUnique({
        where: { userId_characterId_locale: { userId, characterId: char.id, locale: 'ja' } },
      });
      if (relationship) {
        let conversation = await prisma.conversation.findFirst({
          where: { relationshipId: relationship.id },
          orderBy: { createdAt: 'asc' },
        });
        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: { relationshipId: relationship.id },
          });
        }

        // キャラ固有のウェルカムメッセージ
        const slugGreetings: Record<string, string> = {
          luffy: `ししし！フォローしてくれたか！よろしくな！一緒に冒険しようぜ！`,
          zoro: `…フォローか。悪くない。一緒に鍛えるか。`,
          nami: `フォローありがとう♪ これからよろしくね！何かあれば話しかけて。`,
          sanji: `フォロー、ありがとう。君のためなら何でも作るよ。遠慮せずに話しかけてくれ。`,
          chopper: `フォローしてくれたのか！うへへ！嬉しい！いつでも話しかけてよ！`,
          ace: `フォローありがとう！ははっ！これからよろしく！`,
          robin: `フォローしてくれたのね。光栄だわ。これからよろしく。`,
          usopp: `フォローしてくれたぞ！俺の伝説の始まりだ！これからよろしく！`,
          brook: `フォローしてくれましたか！ヨホホホ！骨まで嬉しい！`,
          franky: `SUUUPER！フォローしてくれたぜ！よろしくな！`,
        };
        const greetingMsg = slugGreetings[char.slug] 
          ?? `フォローしてくれてありがとう！${char.name}だよ。これからよろしくね！話しかけてね 💬`;

        // 既にウェルカムメッセージがあればスキップ
        const existingWelcome = await prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            role: 'CHARACTER',
            content: { startsWith: '🎉' },
          },
        });
        if (!existingWelcome) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'CHARACTER',
              content: `🎉 ${greetingMsg}`,
            },
          });
        }

        // 通知も作成
        try {
          await prisma.notification.create({
            data: {
              userId,
              characterId: char.id,
              type: 'CHARACTER_MESSAGE',
              title: char.name,
              body: greetingMsg,
              actorName: char.name,
              actorAvatar: char.avatarUrl,
              targetUrl: `/chat/${char.id}`,
              isRead: false,
            },
          });
        } catch {
          // 通知作成失敗は無視
        }
      }
    }

    return NextResponse.json({
      success: true,
      followedCount: characters.length,
      characterNames: characters.map(c => c.name),
    });
  } catch (error) {
    logger.error('[follow-and-greet] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
